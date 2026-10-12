import { describe, expect, it } from "vitest";
import { citationOrder, parseReply, splitCitations } from "./coach-format";

describe("parseReply", () => {
    it("parses a review into sections, bullets and steps", () => {
        const reply = [
            "Summary: Solid week, 9 commits across 2 habits.",
            "Reading carried most of it.",
            "Wins:",
            "- Reading: 6-day streak",
            "- Gym on Tuesday and Thursday",
            "Watch-outs:",
            "- Gym went quiet after Thursday [KB7]",
            "Next steps:",
            "1. Put your gym bag by the door on Sunday night [KB3]",
            "2. Read before bed",
        ].join("\n");

        expect(parseReply(reply)).toEqual([
            { kind: "heading", title: "Summary", tone: "summary" },
            { kind: "paragraph", text: "Solid week, 9 commits across 2 habits. Reading carried most of it." },
            { kind: "heading", title: "Wins", tone: "wins" },
            { kind: "bullets", items: ["Reading: 6-day streak", "Gym on Tuesday and Thursday"] },
            { kind: "heading", title: "Watch-outs", tone: "watch" },
            { kind: "bullets", items: ["Gym went quiet after Thursday [KB7]"] },
            { kind: "heading", title: "Next steps", tone: "next" },
            { kind: "steps", items: ["Put your gym bag by the door on Sunday night [KB3]", "Read before bed"] },
        ]);
    });

    it("keeps prose answers as paragraphs split on blank lines", () => {
        expect(parseReply("You commit most on Mondays.\nWeekends are quieter.\n\nTry a 2-minute version.")).toEqual([
            { kind: "paragraph", text: "You commit most on Mondays. Weekends are quieter." },
            { kind: "paragraph", text: "Try a 2-minute version." },
        ]);
    });

    it("does not treat a labelled sentence as a heading", () => {
        expect(parseReply("Monday: 3 commits, your best day.")).toEqual([
            { kind: "paragraph", text: "Monday: 3 commits, your best day." },
        ]);
    });

    it("joins wrapped bullet lines and strips stray markdown", () => {
        expect(parseReply("## Wins\n- **Reading** kept going\n  even on Friday\n* Gym twice")).toEqual([
            { kind: "heading", title: "Wins", tone: "wins" },
            { kind: "bullets", items: ["Reading kept going even on Friday", "Gym twice"] },
        ]);
    });

    it("accepts unknown short headings", () => {
        expect(parseReply("Suggestions:\n- Stack it after coffee")).toEqual([
            { kind: "heading", title: "Suggestions", tone: "other" },
            { kind: "bullets", items: ["Stack it after coffee"] },
        ]);
    });
});

describe("citations", () => {
    const text = "Plan a fallback [KB7]\nStart tiny [KB3] [KB7]\nUnknown [KB99]";

    it("numbers known articles by first appearance", () => {
        expect(Array.from(citationOrder(text, new Set([3, 7])))).toEqual([[7, 1], [3, 2]]);
    });

    it("splits markers out of a line and drops unknown tags", () => {
        const order = citationOrder(text, new Set([3, 7]));
        expect(splitCitations("Start tiny [KB3] [KB7] today", order)).toEqual([
            { kind: "text", text: "Start tiny" },
            { kind: "cite", articleId: 3, n: 2 },
            { kind: "cite", articleId: 7, n: 1 },
            { kind: "text", text: " today" },
        ]);
        expect(splitCitations("Unknown [KB99]", order)).toEqual([{ kind: "text", text: "Unknown" }]);
    });
});
