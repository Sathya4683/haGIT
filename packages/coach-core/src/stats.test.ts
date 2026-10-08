import { describe, expect, it } from "vitest";
import type { CheckIn } from "./data";
import { addDays, computeHabitStats, currentStreak, dayKey, daysBetween, localHour, localTime, longestStreak, weekdayOf } from "./stats";

const NOW = new Date("2026-10-07T12:00:00Z"); // a Wednesday
const TODAY = "2026-10-07";

function daysAgo(n: number, hour = 9): string {
    return new Date(Date.UTC(2026, 9, 7 - n, hour)).toISOString();
}

function checkIns(...offsets: number[]): CheckIn[] {
    return offsets.map((n) => ({ habit: "Read", message: `day -${n}`, timestamp: daysAgo(n) }));
}

describe("calendar helpers", () => {
    it("keys instants by the local calendar day", () => {
        // 19:00 UTC on the 3rd is 00:30 IST on the 4th.
        expect(dayKey("2026-09-03T19:00:00Z", "Asia/Kolkata")).toBe("2026-09-04");
        expect(dayKey("2026-09-03T19:00:00Z", "UTC")).toBe("2026-09-03");
        expect(localTime("2026-09-03T19:00:00Z", "Asia/Kolkata")).toBe("00:30");
        expect(localHour("2026-09-03T19:00:00Z", "Asia/Kolkata")).toBe(0);
    });

    it("does day arithmetic on keys, across month ends", () => {
        expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
        expect(daysBetween("2026-09-30", "2026-10-07")).toBe(7);
        expect(weekdayOf(TODAY)).toBe("Wed");
    });
});

describe("streaks", () => {
    const set = (...offsets: number[]) => new Set(offsets.map((n) => addDays(TODAY, -n)));

    it("counts a streak ending today", () => {
        expect(currentStreak(set(0, 1, 2), TODAY)).toBe(3);
    });

    it("keeps yesterday's streak alive until today is over", () => {
        expect(currentStreak(set(1, 2), TODAY)).toBe(2);
    });

    it("drops the streak after a missed day", () => {
        expect(currentStreak(set(2, 3), TODAY)).toBe(0);
        expect(currentStreak(new Set(), TODAY)).toBe(0);
    });

    it("finds the longest run anywhere in history", () => {
        expect(longestStreak(set(0, 1, 5, 6, 7, 10))).toBe(3);
        expect(longestStreak(new Set())).toBe(0);
    });
});

describe("computeHabitStats", () => {
    const opts = { tz: "UTC", now: NOW };

    it("handles a habit with no check-ins", () => {
        const s = computeHabitStats("Read", [], opts);
        expect(s).toMatchObject({
            totalCheckIns: 0,
            activeDaysAllTime: 0,
            lastCheckIn: null,
            daysSinceLast: null,
            currentStreak: 0,
            longestStreak: 0,
            trend: "flat",
            strongestWeekday: null,
            typicalHour: null,
        });
        expect(s.window.consistencyPct).toBe(0);
    });

    it("counts active days, not raw check-ins, for consistency", () => {
        const twiceToday = [...checkIns(0, 1), { habit: "Read", message: "again", timestamp: daysAgo(0, 20) }];
        const s = computeHabitStats("Read", twiceToday, { ...opts, windowDays: 30, createdAt: daysAgo(29) });
        expect(s.totalCheckIns).toBe(3);
        expect(s.window).toEqual({ days: 30, activeDays: 2, checkIns: 3, consistencyPct: 7 });
    });

    it("only counts the days a new habit has existed", () => {
        const s = computeHabitStats("Read", checkIns(0, 1, 2), { ...opts, windowDays: 30 });
        expect(s.window.consistencyPct).toBe(100);
    });

    it("compares the last 7 days with the 7 before", () => {
        const s = computeHabitStats("Read", checkIns(0, 1, 2, 8), opts);
        expect(s.last7Days).toBe(3);
        expect(s.previous7Days).toBe(1);
        expect(s.trend).toBe("up");
        expect(s.daysSinceLast).toBe(0);
    });

    it("ignores future-dated check-ins", () => {
        const s = computeHabitStats("Read", checkIns(-2, 1), opts);
        expect(s.totalCheckIns).toBe(1);
        expect(s.lastCheckIn).toBe("2026-10-06");
    });

    it("only reports weekday patterns with enough data", () => {
        expect(computeHabitStats("Read", checkIns(0, 1, 2), opts).weakestWeekday).toBeNull();

        // Two weeks, skipping both Tuesdays (offsets 1 and 8).
        const s = computeHabitStats("Read", checkIns(0, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13), opts);
        expect(s.activeDaysByWeekday.Tue).toBe(0);
        expect(s.weakestWeekday).toBe("Tue");
    });

    it("uses the local timezone for days and hours", () => {
        // 20:00 UTC = 01:30 next day in IST.
        const late = [{ habit: "Read", message: "late", timestamp: "2026-10-06T20:00:00Z" }];
        const s = computeHabitStats("Read", late, { tz: "Asia/Kolkata", now: NOW });
        expect(s.lastCheckIn).toBe("2026-10-07");
        expect(s.typicalHour).toBe(1);
    });
});
