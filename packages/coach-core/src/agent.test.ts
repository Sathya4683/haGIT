import { describe, expect, it, vi } from "vitest";
import type { Content, FunctionCall, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import type { HabitData } from "./data";
import { CoachError, runCoach, type Generate } from "./agent";

const data: HabitData = {
    listHabits: async () => [{ name: "Read", createdAt: "2026-09-01T00:00:00Z", commitCount: 1 }],
    getCheckIns: async () => [{ habit: "Read", message: "read 20 pages", timestamp: "2026-10-07T09:00:00Z" }],
    logCheckIn: vi.fn(),
};
const ctx = { data, tz: "UTC", now: new Date("2026-10-07T12:00:00Z") };

function callsResponse(...calls: FunctionCall[]) {
    return {
        functionCalls: calls,
        text: undefined,
        candidates: [{ content: { role: "model", parts: calls.map((functionCall) => ({ functionCall })) } }],
    } as unknown as GenerateContentResponse;
}

function textResponse(text: string) {
    return { functionCalls: undefined, text, candidates: [] } as unknown as GenerateContentResponse;
}

/** A fake Gemini that replays `responses` and records what it was sent. */
function scripted(...responses: GenerateContentResponse[]) {
    const requests: { contents: Content[]; config: GenerateContentParameters["config"] }[] = [];
    const generate: Generate = async (params) => {
        requests.push({ contents: structuredClone(params.contents) as Content[], config: params.config });
        const next = responses.shift();
        if (!next) throw new Error("no more scripted responses");
        return next;
    };
    return { generate, requests };
}

describe("runCoach", () => {
    it("runs the model's tool calls and returns its final answer", async () => {
        const { generate, requests } = scripted(
            callsResponse({ id: "1", name: "get_habit_stats", args: { habit: "Read", days: 7 } }),
            textResponse("Summary: solid week."),
        );

        const result = await runCoach({ generate, ctx, request: { mode: "review" } });

        expect(result.reply).toBe("Summary: solid week.");
        expect(result.steps).toBe(2);
        expect(result.toolCalls.map((c) => c.name)).toEqual(["list_habits", "get_habit_stats"]);

        // The first message carries today's date and the prefetched habit list.
        const firstText = requests[0].contents[0].parts?.[0].text ?? "";
        expect(firstText).toContain("Today is 2026-10-07 (Wed)");
        expect(firstText).toContain('"habit":"Read"');

        // The second request includes the model's turn and the tool result.
        const toolTurn = requests[1].contents[2].parts?.[0].functionResponse;
        expect(toolTurn?.name).toBe("get_habit_stats");
        expect(toolTurn?.id).toBe("1");
        expect((toolTurn?.response as { result: { habit: string }[] }).result[0].habit).toBe("Read");
    });

    it("returns tool errors to the model instead of failing", async () => {
        const { generate, requests } = scripted(
            callsResponse({ name: "get_habit_stats", args: { habit: "Run" } }),
            textResponse("You don't have a Run habit."),
        );

        const result = await runCoach({ generate, ctx, request: { mode: "ask", question: "How is running going?" } });

        expect(result.toolCalls[1].error).toContain('Unknown habit "Run"');
        expect(requests[1].contents[2].parts?.[0].functionResponse?.response).toEqual({
            error: 'Unknown habit "Run". Known habits: "Read".',
        });
    });

    it("never runs write tools, even if the model asks", async () => {
        const { generate } = scripted(
            callsResponse({ name: "log_checkin", args: { habit: "Read", message: "fake" } }),
            textResponse("ok"),
        );

        const result = await runCoach({ generate, ctx, request: { mode: "review" } });

        expect(result.toolCalls[1].error).toBe('Unknown tool "log_checkin".');
        expect(data.logCheckIn).not.toHaveBeenCalled();
    });

    it("forces a text answer on the last step", async () => {
        const call = { name: "list_habits", args: {} };
        const { generate, requests } = scripted(
            callsResponse(call),
            callsResponse(call),
            { ...textResponse("Final answer."), functionCalls: [call] } as unknown as GenerateContentResponse,
        );

        const result = await runCoach({ generate, ctx, request: { mode: "review" }, maxSteps: 3 });

        expect(result.steps).toBe(3);
        expect(result.reply).toBe("Final answer.");
        expect(requests[0].config?.toolConfig).toBeUndefined();
        expect(requests[2].config?.toolConfig?.functionCallingConfig?.mode).toBe("NONE");
    });

    it("maps Gemini rate limits to a CoachError", async () => {
        const generate: Generate = async () => {
            throw Object.assign(new Error("quota"), { status: 429 });
        };
        await expect(runCoach({ generate, ctx, request: { mode: "review" } })).rejects.toMatchObject({
            name: "CoachError",
            code: "rate_limited",
        });
    });

    it("rejects an empty answer", async () => {
        const { generate } = scripted(textResponse("  "));
        const run = runCoach({ generate, ctx, request: { mode: "review" } });
        await expect(run).rejects.toBeInstanceOf(CoachError);
        await expect(run).rejects.toMatchObject({ code: "empty" });
    });
});
