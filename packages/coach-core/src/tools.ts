// The habit tool registry — defined once, used by both the Gemini coach
// (function calling, see agent.ts) and the MCP server (packages/mcp).
//
// Each tool has a zod input schema. MCP consumes it directly; Gemini gets it
// as JSON Schema via toFunctionDeclarations(). Tool args come from an LLM, so
// runTool() always validates them before running.

import { z } from "zod";
import type { CheckIn, HabitData, HabitSummary, KnowledgeBase } from "./data";
import { kbTag } from "./citations";
import { computeHabitStats, dayKey, addDays, localTime, weekdayOf } from "./stats";

export interface ToolContext {
    data: HabitData;
    tz: string;
    now?: Date;
    /** Optional: enables search_knowledge_base. */
    kb?: KnowledgeBase;
}

export interface HabitTool {
    name: string;
    title: string;
    description: string;
    inputSchema: z.ZodObject;
    /** false = changes data. The coach only ever gets read-only tools. */
    readOnly: boolean;
    /** Context the tool needs beyond habit data; tools are hidden when it is missing. */
    requires?: "kb";
    run(args: unknown, ctx: ToolContext): Promise<unknown>;
}

function defineTool<S extends z.ZodObject>(tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: S;
    readOnly: boolean;
    requires?: "kb";
    run(args: z.infer<S>, ctx: ToolContext): Promise<unknown>;
}): HabitTool {
    return tool as unknown as HabitTool;
}

// LLMs and people both get habit names slightly wrong ("read" vs "Read").
function resolveHabit(name: string, habits: HabitSummary[]): string {
    const exact = habits.find((h) => h.name === name);
    if (exact) return exact.name;
    const loose = habits.find((h) => h.name.toLowerCase() === name.trim().toLowerCase());
    if (loose) return loose.name;
    const known = habits.map((h) => `"${h.name}"`).join(", ") || "none yet";
    throw new Error(`Unknown habit "${name}". Known habits: ${known}.`);
}

const newestFirst = (a: CheckIn, b: CheckIn) => b.timestamp.localeCompare(a.timestamp);

function present(c: CheckIn, tz: string) {
    const key = dayKey(c.timestamp, tz);
    return { habit: c.habit, message: c.message, when: `${key} ${localTime(c.timestamp, tz)} (${weekdayOf(key)})` };
}

const habitArg = z.string().min(1).max(100).describe("Habit name. Omit for all habits.");

const listHabits = defineTool({
    name: "list_habits",
    title: "List habits",
    description: "List the user's habits with total check-ins, first/last check-in date and days since the last one.",
    inputSchema: z.object({}),
    readOnly: true,
    async run(_args, { data, tz, now }) {
        const [habits, checkIns] = await Promise.all([data.listHabits(), data.getCheckIns()]);
        return habits.map((h) => {
            const s = computeHabitStats(h.name, checkIns.filter((c) => c.habit === h.name), { tz, now });
            return {
                habit: h.name,
                createdOn: dayKey(h.createdAt, tz),
                totalCheckIns: s.totalCheckIns,
                firstCheckIn: s.firstCheckIn,
                lastCheckIn: s.lastCheckIn,
                daysSinceLast: s.daysSinceLast,
            };
        });
    },
});

const getHabitStats = defineTool({
    name: "get_habit_stats",
    title: "Get habit stats",
    description:
        "Computed stats per habit: current and longest streak, consistency % over a window, last 7 days vs the 7 before " +
        "(trend), active days by weekday, strongest/weakest weekday and typical check-in hour (0-23, local time). " +
        "Use these numbers as-is; don't recompute them.",
    inputSchema: z.object({
        habit: habitArg.optional(),
        days: z.number().int().min(7).max(365).default(30).describe("Window for consistency %, in days."),
    }),
    readOnly: true,
    async run({ habit, days }, { data, tz, now }) {
        const habits = await data.listHabits();
        const names = habit ? [resolveHabit(habit, habits)] : habits.map((h) => h.name);
        const checkIns = await data.getCheckIns(habit ? names[0] : undefined);
        return names.map((name) =>
            computeHabitStats(name, checkIns.filter((c) => c.habit === name), {
                tz,
                now,
                windowDays: days,
                createdAt: habits.find((h) => h.name === name)?.createdAt,
            }),
        );
    },
});

const getCheckIns = defineTool({
    name: "get_checkins",
    title: "Get check-ins",
    description: "Recent check-ins (newest first) with their messages and local time. Use for what the user actually wrote.",
    inputSchema: z.object({
        habit: habitArg.optional(),
        days: z.number().int().min(1).max(365).default(14).describe("How many days back to look."),
        limit: z.number().int().min(1).max(100).default(30),
    }),
    readOnly: true,
    async run({ habit, days, limit }, { data, tz, now }) {
        const name = habit ? resolveHabit(habit, await data.listHabits()) : undefined;
        const since = addDays(dayKey(now ?? new Date(), tz), -(days - 1));
        const inWindow = (await data.getCheckIns(name))
            .filter((c) => dayKey(c.timestamp, tz) >= since)
            .sort(newestFirst);
        return {
            total: inWindow.length,
            shown: Math.min(limit, inWindow.length),
            checkIns: inWindow.slice(0, limit).map((c) => present(c, tz)),
        };
    },
});

const searchCheckIns = defineTool({
    name: "search_checkins",
    title: "Search check-ins",
    description:
        "Keyword search over check-in messages (case-insensitive; matches any word, best matches first). " +
        'Use for questions like "when did I mention being tired?".',
    inputSchema: z.object({
        query: z.string().min(1).max(100),
        habit: habitArg.optional(),
        limit: z.number().int().min(1).max(50).default(20),
    }),
    readOnly: true,
    async run({ query, habit, limit }, { data, tz }) {
        const name = habit ? resolveHabit(habit, await data.listHabits()) : undefined;
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const matches = (await data.getCheckIns(name))
            .map((c) => {
                const text = c.message.toLowerCase();
                return { c, score: terms.filter((t) => text.includes(t)).length };
            })
            .filter((m) => m.score > 0)
            .sort((a, b) => b.score - a.score || newestFirst(a.c, b.c));
        return {
            total: matches.length,
            matches: matches.slice(0, limit).map((m) => present(m.c, tz)),
        };
    },
});

const logCheckIn = defineTool({
    name: "log_checkin",
    title: "Log a check-in",
    description:
        "Record a check-in (a haGIT commit) for an existing habit, timestamped now. " +
        "Fails for unknown habits rather than creating one — use create_habit first if the user wants a new habit.",
    inputSchema: z.object({
        habit: z.string().min(1).max(100),
        message: z.string().min(1).max(500).describe('What was done, e.g. "read 20 pages".'),
    }),
    readOnly: false,
    async run({ habit, message }, { data, tz }) {
        if (!data.logCheckIn) throw new Error("This data source is read-only.");
        // The push API silently creates missing habits, so a typo would make a new habit.
        const name = resolveHabit(habit, await data.listHabits());
        const logged = await data.logCheckIn(name, message.trim());
        return { logged: present(logged, tz) };
    },
});

const createHabit = defineTool({
    name: "create_habit",
    title: "Create a habit",
    description:
        "Create a new habit (a haGIT branch). Only when the user explicitly asks for a new habit. " +
        "Fails if a habit with the same name already exists, ignoring case.",
    inputSchema: z.object({
        name: z.string().trim().min(1).max(100).describe('Habit name, e.g. "Jogging".'),
    }),
    readOnly: false,
    async run({ name }, { data, tz }) {
        if (!data.createHabit) throw new Error("This data source is read-only.");
        // Names are unique per user only case-sensitively; "Jogging" next to "jogging" is a mistake.
        const existing = (await data.listHabits()).find((h) => h.name.toLowerCase() === name.toLowerCase());
        if (existing) throw new Error(`Habit "${existing.name}" already exists.`);
        const created = await data.createHabit(name);
        return { created: { habit: created.name, createdOn: dayKey(created.createdAt, tz) } };
    },
});

const searchKnowledgeBase = defineTool({
    name: "search_knowledge_base",
    title: "Search the habit knowledge base",
    description:
        "Search haGIT's curated, research-backed articles on building habits (missed days, weak weekdays, " +
        "motivation, planning, environment, streaks). Returns short passages tagged like KB12. Use for general " +
        "advice, never as a source of the user's own data, and cite each passage you use with its tag.",
    inputSchema: z.object({
        query: z.string().trim().min(3).max(300).describe("The user's situation in plain words, e.g. \"keeps skipping workouts on Fridays\"."),
        limit: z.number().int().min(1).max(6).default(3).describe("Maximum passages to return."),
    }),
    readOnly: true,
    requires: "kb",
    async run({ query, limit }, { kb }) {
        if (!kb) throw new Error("The knowledge base isn't available here.");
        const hits = await kb.search(query, { limit });
        return {
            results: hits.map((h) => ({
                tag: kbTag(h.articleId),
                title: h.title,
                section: h.heading,
                excerpt: h.content.slice(0, 700),
                ...(h.url && { url: h.url }),
            })),
        };
    },
});

export const habitTools: HabitTool[] = [
    listHabits,
    getHabitStats,
    getCheckIns,
    searchCheckIns,
    logCheckIn,
    createHabit,
    searchKnowledgeBase,
];
export const readOnlyTools: HabitTool[] = habitTools.filter((t) => t.readOnly);

/** Tools whose requirements the context satisfies. */
export function toolsFor(tools: HabitTool[], ctx: Pick<ToolContext, "kb">): HabitTool[] {
    return tools.filter((t) => t.requires !== "kb" || Boolean(ctx.kb));
}

/** Validate `args` against the tool's schema, then run it. Throws on unknown tool or bad args. */
export async function runTool(tools: HabitTool[], name: string, args: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`Unknown tool "${name}".`);
    const parsed = tool.inputSchema.safeParse(args ?? {});
    if (!parsed.success) throw new Error(`Invalid arguments for ${name}: ${z.prettifyError(parsed.error)}`);
    return tool.run(parsed.data, ctx);
}

/** Gemini function declarations for `tools`. */
export function toFunctionDeclarations(tools: HabitTool[]) {
    return tools.map((t) => {
        // io: "input" keeps defaulted fields optional; Gemini doesn't want the $schema key.
        const { $schema: _, ...parametersJsonSchema } = z.toJSONSchema(t.inputSchema, { io: "input" });
        return { name: t.name, description: t.description, parametersJsonSchema };
    });
}
