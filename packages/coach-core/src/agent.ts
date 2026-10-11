// The coach: a Gemini function-calling loop over the read-only habit tools.
//
//   user message ─▶ Gemini ─▶ function calls? ─yes─▶ run tools ─▶ results back ─┐
//                     ▲                       └─no──▶ final text reply         │
//                     └────────────────────────────────────────────────────────┘
//
// The last allowed step forces a text answer, so a run costs at most MAX_STEPS
// model calls — free-tier quota is shared by every user.

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import type { Content, GenerateContentParameters, GenerateContentResponse, Part } from "@google/genai";
import { readOnlyTools, runTool, toFunctionDeclarations, toolsFor, type ToolContext } from "./tools";
import { sanitizeCitations } from "./citations";
import type { KbSnippet, KnowledgeBase } from "./data";
import { dayKey } from "./stats";
import { COACH_SYSTEM_PROMPT, buildUserMessage, type CoachRequest } from "./prompts";

export type { CoachRequest } from "./prompts";

export type Generate = (params: GenerateContentParameters) => Promise<GenerateContentResponse>;

// Flash-Lite: the coach only explains numbers the tools computed, and the full
// Flash model is often overloaded on the free tier (27s for a one-word reply
// when tested, against ~1s for Lite).
export const DEFAULT_MODEL = "gemini-flash-lite-latest";
export const MAX_STEPS = 5;

export type CoachErrorCode = "rate_limited" | "timeout" | "upstream" | "empty";

export class CoachError extends Error {
    constructor(readonly code: CoachErrorCode, message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = "CoachError";
    }
}

export interface ToolCallRecord {
    name: string;
    args: Record<string, unknown>;
    error?: string;
}

export interface CoachSource {
    articleId: number;
    slug: string;
    title: string;
}

export interface CoachResult {
    reply: string;
    toolCalls: ToolCallRecord[];
    model: string;
    steps: number;
    /** Knowledge-base articles cited in the reply, in order of first citation. */
    sources: CoachSource[];
}

/** Real Gemini client. One SDK-level retry covers transient 429/5xx blips. */
export function geminiGenerate(apiKey: string): Generate {
    const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { retryOptions: { attempts: 2, initialDelay: 2, maxDelay: 4 } },
    });
    return (params) => ai.models.generateContent(params);
}

async function callModel(generate: Generate, params: GenerateContentParameters, signal?: AbortSignal) {
    try {
        return await generate(params);
    } catch (e) {
        if (signal?.aborted) throw new CoachError("timeout", "The coach took too long. Try again.", { cause: e });
        const status = (e as { status?: unknown }).status;
        if (status === 429) {
            throw new CoachError("rate_limited", "The coach is busy (Gemini free-tier limit). Try again in a minute.", { cause: e });
        }
        if (status === 503) {
            throw new CoachError("upstream", "Gemini is overloaded right now. Try again in a minute.", { cause: e });
        }
        throw new CoachError("upstream", `Gemini request failed${typeof status === "number" ? ` (${status})` : ""}.`, { cause: e });
    }
}

export async function runCoach(opts: {
    generate: Generate;
    ctx: ToolContext;
    request: CoachRequest;
    model?: string;
    maxSteps?: number;
    signal?: AbortSignal;
}): Promise<CoachResult> {
    const { generate, request, signal } = opts;
    const model = opts.model || DEFAULT_MODEL;
    const maxSteps = opts.maxSteps ?? MAX_STEPS;
    const toolCalls: ToolCallRecord[] = [];

    // Every passage the model sees (pre-retrieved or via the search tool) may be cited.
    const passages = new Map<number, KbSnippet>();
    request.library?.forEach((p) => passages.set(p.articleId, p));
    const kb: KnowledgeBase | undefined = opts.ctx.kb && {
        async search(query, o) {
            const hits = await opts.ctx.kb!.search(query, o);
            hits.forEach((h) => passages.set(h.articleId, h));
            return hits;
        },
    };
    const ctx: ToolContext = { ...opts.ctx, kb };

    // Every answer needs the habit list, so fetch it up front and save a round
    // trip. It's then left out of the model's tools: told it's already there,
    // Flash-Lite still called it again.
    const habits = await runTool(readOnlyTools, "list_habits", {}, ctx);
    toolCalls.push({ name: "list_habits", args: {} });
    const tools = toolsFor(readOnlyTools, ctx).filter((t) => t.name !== "list_habits");
    const functionDeclarations = toFunctionDeclarations(tools);

    const today = dayKey(ctx.now ?? new Date(), ctx.tz);
    const contents: Content[] = [
        { role: "user", parts: [{ text: buildUserMessage(request, { today, tz: ctx.tz, habits }) }] },
    ];

    for (let step = 1; step <= maxSteps; step++) {
        const last = step === maxSteps;
        const response = await callModel(
            generate,
            {
                model,
                contents,
                config: {
                    systemInstruction: COACH_SYSTEM_PROMPT,
                    tools: [{ functionDeclarations }],
                    ...(last && { toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.NONE } } }),
                    abortSignal: signal,
                },
            },
            signal,
        );

        const calls = response.functionCalls ?? [];
        if (calls.length === 0 || last) {
            const raw = response.text?.trim();
            if (!raw) throw new CoachError("empty", "The coach returned an empty answer. Try again.");
            const { text: reply, cited } = sanitizeCitations(raw, new Set(passages.keys()));
            const sources = cited.map((id) => {
                const p = passages.get(id)!;
                return { articleId: id, slug: p.slug, title: p.title };
            });
            return { reply, toolCalls, model, steps: step, sources };
        }

        // Send back the model's own turn untouched — it carries the thought
        // signatures newer Gemini models require on the next request.
        contents.push(response.candidates?.[0]?.content ?? { role: "model", parts: calls.map((functionCall) => ({ functionCall })) });

        const results: Part[] = [];
        for (const call of calls) {
            const name = call.name ?? "";
            const args = call.args ?? {};
            const record: ToolCallRecord = { name, args };
            let output: Record<string, unknown>;
            try {
                output = { result: await runTool(tools, name, args, ctx) };
            } catch (e) {
                // Let the model see the error (e.g. a misspelled habit) and recover.
                record.error = (e as Error).message;
                output = { error: record.error };
            }
            toolCalls.push(record);
            results.push({ functionResponse: { id: call.id, name, response: output } });
        }
        contents.push({ role: "user", parts: results });
    }

    throw new Error("unreachable: the last step always returns or throws");
}
