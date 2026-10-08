import { describe, expect, it, vi } from "vitest";
import type { CheckIn, HabitData } from "./data";
import { habitTools, readOnlyTools, runTool, toFunctionDeclarations, type ToolContext } from "./tools";

const NOW = new Date("2026-10-07T12:00:00Z");

const CHECK_INS: CheckIn[] = [
    { habit: "Read", message: "read 20 pages, felt tired", timestamp: "2026-10-07T09:00:00Z" },
    { habit: "Read", message: "read before bed", timestamp: "2026-10-06T21:30:00Z" },
    { habit: "Read", message: "tired, skimmed a chapter", timestamp: "2026-09-01T21:00:00Z" },
    { habit: "Gym", message: "leg day", timestamp: "2026-10-05T07:00:00Z" },
];

function fakeData(overrides: Partial<HabitData> = {}): HabitData {
    return {
        listHabits: async () => [
            { name: "Read", createdAt: "2026-08-01T00:00:00Z", commitCount: 3 },
            { name: "Gym", createdAt: "2026-10-01T00:00:00Z", commitCount: 1 },
        ],
        getCheckIns: async (habit) => CHECK_INS.filter((c) => !habit || c.habit === habit),
        ...overrides,
    };
}

const ctx = (data = fakeData()): ToolContext => ({ data, tz: "UTC", now: NOW });

describe("runTool", () => {
    it("rejects unknown tools and invalid arguments", async () => {
        await expect(runTool(habitTools, "drop_tables", {}, ctx())).rejects.toThrow('Unknown tool "drop_tables"');
        await expect(runTool(habitTools, "get_habit_stats", { days: 3 }, ctx())).rejects.toThrow(
            "Invalid arguments for get_habit_stats",
        );
    });

    it("lists habits with their activity", async () => {
        const result = await runTool(habitTools, "list_habits", {}, ctx());
        expect(result).toEqual([
            { habit: "Read", createdOn: "2026-08-01", totalCheckIns: 3, firstCheckIn: "2026-09-01", lastCheckIn: "2026-10-07", daysSinceLast: 0 },
            { habit: "Gym", createdOn: "2026-10-01", totalCheckIns: 1, firstCheckIn: "2026-10-05", lastCheckIn: "2026-10-05", daysSinceLast: 2 },
        ]);
    });

    it("matches habit names case-insensitively and explains unknown ones", async () => {
        const stats = (await runTool(habitTools, "get_habit_stats", { habit: "read" }, ctx())) as { habit: string }[];
        expect(stats.map((s) => s.habit)).toEqual(["Read"]);

        await expect(runTool(habitTools, "get_habit_stats", { habit: "Run" }, ctx())).rejects.toThrow(
            'Unknown habit "Run". Known habits: "Read", "Gym".',
        );
    });

    it("returns stats for every habit by default", async () => {
        const stats = (await runTool(habitTools, "get_habit_stats", {}, ctx())) as { habit: string; currentStreak: number }[];
        expect(stats.map((s) => [s.habit, s.currentStreak])).toEqual([["Read", 2], ["Gym", 0]]);
    });

    it("returns recent check-ins newest first, within the window and limit", async () => {
        const result = await runTool(habitTools, "get_checkins", { habit: "Read", days: 7, limit: 1 }, ctx());
        expect(result).toEqual({
            total: 2,
            shown: 1,
            checkIns: [{ habit: "Read", message: "read 20 pages, felt tired", when: "2026-10-07 09:00 (Wed)" }],
        });
    });

    it("ranks keyword matches by how many terms they hit", async () => {
        const result = (await runTool(habitTools, "search_checkins", { query: "tired chapter" }, ctx())) as {
            total: number;
            matches: { message: string }[];
        };
        expect(result.total).toBe(2);
        expect(result.matches.map((m) => m.message)).toEqual(["tired, skimmed a chapter", "read 20 pages, felt tired"]);
    });
});

describe("log_checkin", () => {
    it("logs to the resolved habit name", async () => {
        const logCheckIn = vi.fn(async (habit: string, message: string) => ({ habit, message, timestamp: NOW.toISOString() }));
        const result = await runTool(habitTools, "log_checkin", { habit: "gym", message: " ran 5k " }, ctx(fakeData({ logCheckIn })));
        expect(logCheckIn).toHaveBeenCalledWith("Gym", "ran 5k");
        expect(result).toEqual({ logged: { habit: "Gym", message: "ran 5k", when: "2026-10-07 12:00 (Wed)" } });
    });

    it("refuses unknown habits instead of creating one", async () => {
        const logCheckIn = vi.fn();
        await expect(
            runTool(habitTools, "log_checkin", { habit: "Gim", message: "x" }, ctx(fakeData({ logCheckIn }))),
        ).rejects.toThrow('Unknown habit "Gim"');
        expect(logCheckIn).not.toHaveBeenCalled();
    });

    it("fails on a read-only data source", async () => {
        await expect(runTool(habitTools, "log_checkin", { habit: "Gym", message: "x" }, ctx())).rejects.toThrow("read-only");
    });

    it("is never offered to the coach", () => {
        expect(readOnlyTools.map((t) => t.name)).not.toContain("log_checkin");
    });
});

describe("create_habit", () => {
    it("creates a habit with the trimmed name", async () => {
        const createHabit = vi.fn(async (name: string) => ({ name, createdAt: NOW.toISOString(), commitCount: 0 }));
        const result = await runTool(habitTools, "create_habit", { name: "  Jogging " }, ctx(fakeData({ createHabit })));
        expect(createHabit).toHaveBeenCalledWith("Jogging");
        expect(result).toEqual({ created: { habit: "Jogging", createdOn: "2026-10-07" } });
    });

    it("refuses a name that already exists in any case", async () => {
        const createHabit = vi.fn();
        await expect(
            runTool(habitTools, "create_habit", { name: "gym" }, ctx(fakeData({ createHabit }))),
        ).rejects.toThrow('Habit "Gym" already exists.');
        expect(createHabit).not.toHaveBeenCalled();
    });

    it("fails on a read-only data source and is never offered to the coach", async () => {
        await expect(runTool(habitTools, "create_habit", { name: "Jogging" }, ctx())).rejects.toThrow("read-only");
        expect(readOnlyTools.map((t) => t.name)).not.toContain("create_habit");
    });
});

describe("toFunctionDeclarations", () => {
    it("emits JSON Schema without $schema and keeps defaulted args optional", () => {
        const decls = toFunctionDeclarations(habitTools);
        const byName = Object.fromEntries(decls.map((d) => [d.name, d.parametersJsonSchema]));
        for (const schema of Object.values(byName)) expect(schema).not.toHaveProperty("$schema");
        expect(byName.get_checkins.required ?? []).toEqual([]);
        expect(byName.search_checkins.required).toEqual(["query"]);
        expect(byName.get_habit_stats.properties).toHaveProperty("days");
    });
});
