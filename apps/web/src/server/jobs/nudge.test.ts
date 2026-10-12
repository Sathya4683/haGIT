import { describe, expect, it } from "vitest";
import { composeNudge } from "./nudge";

describe("composeNudge", () => {
    const url = "https://hagit.test/dashboard";

    it("returns nothing when every habit is done", () => {
        expect(composeNudge([], url)).toBeNull();
    });

    it("lists open habits, longest streak first, and raises priority for long streaks", () => {
        const msg = composeNudge([{ name: "Gym", streak: 0 }, { name: "Reading", streak: 9 }], url)!;
        expect(msg.title).toBe("2 habits still open today");
        expect(msg.message.split("\n").slice(0, 2)).toEqual(["• Reading (9-day streak)", "• Gym"]);
        expect(msg.priority).toBe(4);
        expect(msg.tags).toEqual(["fire"]);
        expect(msg.click).toBe(url);
    });

    it("uses a gentle default for a single habit without a streak", () => {
        const msg = composeNudge([{ name: "Meditate", streak: 1 }], url)!;
        expect(msg.title).toBe("Meditate is still open today");
        expect(msg.priority).toBe(3);
        expect(msg.message).toContain("A two-minute version still counts.");
    });

    it("caps long lists", () => {
        const habits = Array.from({ length: 9 }, (_, i) => ({ name: `H${i}`, streak: 0 }));
        expect(composeNudge(habits, url)!.message).toContain("…and 3 more");
    });
});
