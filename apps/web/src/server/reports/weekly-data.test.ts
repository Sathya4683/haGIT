import { describe, expect, it } from "vitest";
import { currentWeekStart, previousWeekStart, weeklyInsight } from "./weekly-data";

const days = (counts: number[]) =>
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((weekday, i) => ({ date: `2026-10-0${i + 5}`, weekday, count: counts[i] }));

describe("weekly report helpers", () => {
    it("finds the previous and current week in the user's timezone", () => {
        // Monday 2026-10-12 02:00 in Kolkata is still Sunday in UTC.
        const now = new Date("2026-10-11T20:30:00Z");
        expect(previousWeekStart(now, "Asia/Kolkata")).toBe("2026-10-05");
        expect(currentWeekStart(now, "Asia/Kolkata")).toBe("2026-10-12");
        expect(previousWeekStart(now, "UTC")).toBe("2026-09-28");
    });

    it("writes a deterministic insight", () => {
        const base = { habits: [{ name: "Gym", commits: 3, previous: 1, currentStreak: 1, longestStreak: 2 }] };
        expect(weeklyInsight({ ...base, days: days([0, 0, 0, 0, 0, 0, 0]), totals: { commits: 0, previous: 2, activeDays: 0 } })).toMatch(/^A quiet week/);
        expect(weeklyInsight({ ...base, days: days([1, 1, 1, 1, 1, 1, 1]), totals: { commits: 7, previous: 2, activeDays: 7 } })).toMatch(/all seven days/);
        expect(weeklyInsight({ ...base, days: days([0, 3, 0, 0, 0, 0, 0]), totals: { commits: 3, previous: 1, activeDays: 1 } })).toBe(
            "Up 2 commits on last week, with Tuesday your strongest day. Keep the momentum by protecting that slot.",
        );
        const quiet = { habits: [{ name: "Read", commits: 0, previous: 4, currentStreak: 0, longestStreak: 5 }] };
        expect(weeklyInsight({ ...quiet, days: days([0, 0, 1, 0, 0, 0, 0]), totals: { commits: 1, previous: 4, activeDays: 1 } })).toMatch(/^Read went quiet/);
    });
});
