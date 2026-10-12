import { describe, expect, it } from "vitest";
import type { Content, FunctionCall, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import type { HabitData, KbSnippet } from "./data";
import { formatLibrary, sanitizeCitations } from "./citations";
import { readOnlyTools, toFunctionDeclarations, toolsFor } from "./tools";
import { runCoach, type Generate } from "./agent";

const snippet = (articleId: number, slug: string): KbSnippet => ({
    articleId,
    slug,
    title: slug.replace(/-/g, " "),
    heading: `${slug} > Section`,
    content: `Passage from ${slug}.`,
});

describe("sanitizeCitations", () => {
    it("keeps known tags, drops invented ones and records order", () => {
        const { text, cited } = sanitizeCitations(
            "- Plan a fallback for Fridays [KB7]\n- Keep it tiny [KB99]\n- Restart Monday [KB3] [KB7]",
            new Set([3, 7]),
        );
        expect(text).toBe("- Plan a fallback for Fridays [KB7]\n- Keep it tiny\n- Restart Monday [KB3] [KB7]");
        expect(cited).toEqual([7, 3]);
    });

    it("normalises spacing and grouped variants", () => {
        expect(sanitizeCitations("Do this [KB 3, KB 7].", new Set([3, 7])).text).toBe("Do this [KB3] [KB7].");
        expect(sanitizeCitations("Nothing here [KB5].", new Set()).text).toBe("Nothing here.");
    });

    it("formats a tagged library block", () => {
        const block = formatLibrary([snippet(7, "never-miss-twice")]);
        expect(block).toContain("[KB7] never-miss-twice > Section\nPassage from never-miss-twice.");
    });
});

describe("knowledge base tool", () => {
    it("is only offered when a knowledge base is available", () => {
        expect(toolsFor(readOnlyTools, {}).map((t) => t.name)).not.toContain("search_knowledge_base");
        const kb = { search: async () => [] };
        expect(toolsFor(readOnlyTools, { kb }).map((t) => t.name)).toContain("search_knowledge_base");
        expect(() => toFunctionDeclarations(toolsFor(readOnlyTools, { kb }))).not.toThrow();
    });
});

describe("runCoach citations", () => {
    const data: HabitData = {
        listHabits: async () => [{ name: "Gym", createdAt: "2026-09-01T00:00:00Z", commitCount: 3 }],
        getCheckIns: async () => [],
    };
    const text = (t: string) => ({ functionCalls: undefined, text: t, candidates: [] }) as unknown as GenerateContentResponse;
    const calls = (...c: FunctionCall[]) =>
        ({ functionCalls: c, candidates: [{ content: { role: "model", parts: c.map((functionCall) => ({ functionCall })) } }] }) as unknown as GenerateContentResponse;

    function scripted(...responses: GenerateContentResponse[]) {
        const requests: { contents: Content[]; config: GenerateContentParameters["config"] }[] = [];
        const generate: Generate = async (params) => {
            requests.push({ contents: structuredClone(params.contents) as Content[], config: params.config });
            return responses.shift()!;
        };
        return { generate, requests };
    }

    it("injects pre-retrieved passages and returns cited sources", async () => {
        const { generate, requests } = scripted(text("Skip less on Fridays with an if-then plan [KB2]. Invented [KB40]."));
        const result = await runCoach({
            generate,
            ctx: { data, tz: "UTC" },
            request: { mode: "ask", question: "Why do I skip Fridays?", library: [snippet(2, "implementation-intentions")] },
        });
        expect(requests[0].contents[0].parts?.[0].text).toContain("[KB2] implementation-intentions > Section");
        expect(result.reply).toBe("Skip less on Fridays with an if-then plan [KB2]. Invented.");
        expect(result.sources).toEqual([{ articleId: 2, slug: "implementation-intentions", title: "implementation intentions" }]);
    });

    it("allows citing passages found through the search tool", async () => {
        const kb = { search: async () => [snippet(5, "never-miss-twice")] };
        const { generate } = scripted(
            calls({ id: "1", name: "search_knowledge_base", args: { query: "missed a day" } }),
            text("One miss is fine; avoid a second [KB5]."),
        );
        const result = await runCoach({ generate, ctx: { data, tz: "UTC", kb }, request: { mode: "review" } });
        expect(result.sources.map((s) => s.slug)).toEqual(["never-miss-twice"]);
        expect(result.toolCalls.map((c) => c.name)).toContain("search_knowledge_base");
    });
});
