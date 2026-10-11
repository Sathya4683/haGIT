export const runtime = "nodejs";
// A coach run is a few sequential Gemini calls; give it room beyond the default.
export const maxDuration = 60;

import { z } from "zod";
import { CoachError, geminiGenerate, runCoach } from "@hagit/coach-core/agent";
import { rateLimits } from "@/lib/rate-limit";
import { prismaHabitData } from "@/lib/coach-data";
import { withRoute } from "@/server/http/withRoute";
import { HttpError } from "@/server/http/errors";
import { getLogger } from "@/server/obs/logger";
import { timezone } from "@/server/http/schemas";
import { coachKnowledgeBase } from "@/server/kb/service";

const MAX_QUESTION_CHARS = 500;
const MAX_PREVIOUS_REVIEW_CHARS = 2000;
const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHARS = 3000;
const RUN_TIMEOUT_MS = 45_000; // stays under maxDuration
const GEMINI_RETRY_AFTER_S = 60;

const coachLog = getLogger("coach");

const body = z
    .object({
        mode: z.enum(["review", "ask"], { error: 'mode must be "review" or "ask".' }),
        question: z
            .string()
            .trim()
            .max(MAX_QUESTION_CHARS, `Keep questions under ${MAX_QUESTION_CHARS} characters.`)
            .optional()
            .default(""),
        previousReview: z
            .string()
            .optional()
            .transform((s) => s?.slice(0, MAX_PREVIOUS_REVIEW_CHARS)),
        /** Recent turns of the current chat, oldest first, so follow-up questions have context. */
        history: z
            .array(z.object({ role: z.enum(["user", "coach"]), text: z.string().max(4000) }))
            .max(20)
            .optional()
            .default([]),
        tz: timezone,
    })
    .refine((b) => b.mode !== "ask" || b.question.length > 0, { message: "question is required." });

/** Keeps the most recent turns within a character budget. */
function recentHistory(history: { role: "user" | "coach"; text: string }[]) {
    const kept: string[] = [];
    let used = 0;
    for (const turn of history.slice(-MAX_HISTORY_TURNS).reverse()) {
        const line = `${turn.role === "user" ? "Me" : "You"}: ${turn.text.replace(/\s+/g, " ").trim()}`;
        if (used + line.length > MAX_HISTORY_CHARS) break;
        kept.unshift(line);
        used += line.length;
    }
    return kept.join("\n");
}

// POST /api/coach
// Body: { mode: "review" | "ask", question?, tz?, previousReview?, history? }
// Returns { reply, toolCalls: [{ name, args }], model, sources: [{ articleId, slug, title }] }
// Ask mode retrieves knowledge-base passages before calling the model (no extra model step);
// review mode lets the model search the knowledge base as a tool.
// Disabled (503) unless GEMINI_API_KEY is set.
export const POST = withRoute(
    {
        name: "POST /api/coach",
        auth: "user",
        body,
        // Checked after validation so a malformed request doesn't burn one of the hourly runs.
        rateLimit: ({ user }) =>
            process.env.GEMINI_API_KEY ? [rateLimits.coach(user.userId), rateLimits.coachGlobal()] : null,
    },
    async ({ user, body, requestId }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new HttpError(503, "The coach isn't enabled on this server.");

        const started = Date.now();
        const history = recentHistory(body.history);
        const question = history && body.mode === "ask" ? `Earlier in this chat:\n${history}\n\nNow: ${body.question}` : body.question;

        const library =
            body.mode === "ask" ? await coachKnowledgeBase("coach-ask").search(body.question, { limit: 4 }) : undefined;
        const retrievalMs = Date.now() - started;

        try {
            const result = await runCoach({
                generate: geminiGenerate(apiKey),
                model: process.env.GEMINI_MODEL,
                ctx: {
                    data: prismaHabitData(user.userId),
                    tz: body.tz,
                    kb: body.mode === "review" ? coachKnowledgeBase("coach-review") : undefined,
                },
                request: { mode: body.mode, question, previousReview: body.previousReview, library },
                signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
            });

            // Tool names, counts and timing only — never habit data or messages.
            coachLog.info("coach run", {
                requestId,
                userId: user.userId,
                mode: body.mode,
                model: result.model,
                steps: result.steps,
                tools: result.toolCalls.map((t) => (t.error ? `${t.name}(error)` : t.name)).join(","),
                kbPassages: library?.length ?? 0,
                kbCited: result.sources.length,
                retrievalMs,
                durationMs: Date.now() - started,
                outcome: "ok",
            });

            return Response.json({
                reply: result.reply,
                toolCalls: result.toolCalls.map(({ name, args }) => ({ name, args })),
                model: result.model,
                sources: result.sources,
            });
        } catch (e) {
            if (!(e instanceof CoachError)) throw e;
            coachLog.warn("coach run failed", {
                requestId,
                userId: user.userId,
                mode: body.mode,
                durationMs: Date.now() - started,
                outcome: e.code,
                err: e.cause ?? e,
            });
            if (e.code === "rate_limited") {
                throw new HttpError(429, e.message, { retryAfter: GEMINI_RETRY_AFTER_S }, {
                    "Retry-After": String(GEMINI_RETRY_AFTER_S),
                });
            }
            throw new HttpError(e.code === "timeout" ? 504 : 502, e.message);
        }
    },
);
