import { describe, expect, it } from "vitest";
import { addDaysToKey, isoWeekKey, localDayKey, zonedDayRange, zonedParts, zonedStartOfDay } from "./datetime";

describe("zoned calendar helpers", () => {
    it("finds local midnight for fixed and DST zones", () => {
        expect(zonedStartOfDay("2026-09-04", "Asia/Kolkata").toISOString()).toBe("2026-09-03T18:30:00.000Z");
        expect(zonedStartOfDay("2026-07-01", "America/New_York").toISOString()).toBe("2026-07-01T04:00:00.000Z");
        expect(zonedStartOfDay("2026-01-15", "America/New_York").toISOString()).toBe("2026-01-15T05:00:00.000Z");
        expect(zonedStartOfDay("2026-03-01", "UTC").toISOString()).toBe("2026-03-01T00:00:00.000Z");
    });

    it("spans 23 hours on a spring-forward day", () => {
        const { start, end } = zonedDayRange("2026-03-08", "America/New_York");
        expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
    });

    it("round-trips with localDayKey at the range edges", () => {
        const { start, end } = zonedDayRange("2026-10-11", "Asia/Kolkata");
        expect(localDayKey(start, "Asia/Kolkata")).toBe("2026-10-11");
        expect(localDayKey(new Date(end.getTime() - 1), "Asia/Kolkata")).toBe("2026-10-11");
        expect(localDayKey(end, "Asia/Kolkata")).toBe("2026-10-12");
    });

    it("reports local hour and weekday", () => {
        expect(zonedParts(new Date("2026-10-11T15:35:00Z"), "Asia/Kolkata")).toEqual({
            dateKey: "2026-10-11",
            hour: 21,
            minute: 5,
            weekday: 0,
        });
    });

    it("adds days across month and year boundaries", () => {
        expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
        expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
    });

    it("computes ISO week keys, including year boundaries", () => {
        expect(isoWeekKey("2026-10-05")).toBe("2026-W41");
        expect(isoWeekKey("2026-10-11")).toBe("2026-W41");
        expect(isoWeekKey("2021-01-03")).toBe("2020-W53");
        expect(isoWeekKey("2024-12-30")).toBe("2025-W01");
    });
});
