import { currentStreak, longestStreak } from "@hagit/coach-core";
import { articlesFromHits } from "@hagit/kb/search";
import { prisma } from "@/lib/prisma";
import { addDaysToKey, isoWeekKey, localDayKey, zonedParts, zonedStartOfDay } from "@/lib/datetime";
import { articleUrl, searchKb } from "@/server/kb/service";
import { getLogger } from "@/server/obs/logger";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HEATMAP_WEEKS = 12;
const log = getLogger("job");

export interface WeeklyReportData {
    email: string;
    palette: string;
    week: { key: string; start: string; end: string; label: string };
    totals: { commits: number; previous: number; activeDays: number };
    /** Mon…Sun of the report week. */
    days: { date: string; weekday: string; count: number }[];
    habits: { name: string; commits: number; previous: number; currentStreak: number; longestStreak: number }[];
    bestHabit: string | null;
    insight: string;
    /** HEATMAP_WEEKS × 7 days ending on the report week's Sunday. */
    heatmap: { date: string; count: number }[];
    articles: { id: number; slug: string; title: string; summary: string; url: string }[];
}

/** Monday (yyyy-MM-dd) of the week before the one containing `now` in `tz`. */
export function previousWeekStart(now: Date, tz: string): string {
    const { dateKey, weekday } = zonedParts(now, tz);
    const daysSinceMonday = (weekday + 6) % 7;
    return addDaysToKey(dateKey, -daysSinceMonday - 7);
}

/** Monday of the week containing `now` (for "this week so far" previews). */
export function currentWeekStart(now: Date, tz: string): string {
    const { dateKey, weekday } = zonedParts(now, tz);
    return addDaysToKey(dateKey, -((weekday + 6) % 7));
}

function formatRange(start: string, end: string) {
    const fmt = (key: string, withYear: boolean) =>
        new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear && { year: "numeric" }), timeZone: "UTC" });
    return `${fmt(start, false)} – ${fmt(end, true)}`;
}

export function weeklyInsight(d: Pick<WeeklyReportData, "totals" | "days" | "habits">): string {
    const { commits, previous, activeDays } = d.totals;
    if (commits === 0) return "A quiet week. Pick your smallest habit and commit a two-minute version today: restarting beats waiting for the perfect moment.";
    if (activeDays === 7) return "You committed on all seven days. That kind of consistency is exactly how habits become automatic.";
    const best = [...d.days].sort((a, b) => b.count - a.count)[0];
    const quiet = d.habits.find((h) => h.commits === 0 && h.previous > 0);
    if (quiet) return `${quiet.name} went quiet this week after ${quiet.previous} commit${quiet.previous === 1 ? "" : "s"} the week before. Shrink it to the smallest version and anchor it to ${best.weekday}, your strongest day.`;
    const diff = commits - previous;
    if (diff > 0) return `Up ${diff} commit${diff === 1 ? "" : "s"} on last week, with ${best.weekday} your strongest day. Keep the momentum by protecting that slot.`;
    if (diff < 0) return `${-diff} fewer commit${diff === -1 ? "" : "s"} than last week. ${best.weekday} was your strongest day: try planning the others around it.`;
    return `Steady week: the same number of commits as last week, and ${best.weekday} was your strongest day.`;
}

function articleQuery(d: Pick<WeeklyReportData, "totals" | "habits">) {
    if (d.totals.commits === 0) return "getting back on track after missing a whole week";
    if (d.habits.some((h) => h.commits === 0 && h.previous > 0)) return "restarting a habit that went quiet after missed days";
    if (d.totals.activeDays <= 3) return "missing days and struggling to stay consistent";
    return "keeping a streak going and building momentum";
}

async function pickArticles(d: Pick<WeeklyReportData, "totals" | "habits" | "week">) {
    try {
        const { hits } = await searchKb(articleQuery(d), { purpose: "weekly-report", limit: 4 });
        const ids = articlesFromHits(hits).slice(0, 3).map((a) => a.id);
        const fallback = ids.length
            ? []
            : await prisma.kbArticle.findMany({ where: { status: "PUBLISHED" }, select: { id: true }, orderBy: { id: "asc" } });
        const pickIds = ids.length ? ids : fallback.filter((_, i) => (i + Number(d.week.key.slice(-2))) % 5 === 0).slice(0, 2).map((a) => a.id);
        const rows = await prisma.kbArticle.findMany({
            where: { id: { in: pickIds }, status: "PUBLISHED" },
            select: { id: true, slug: true, title: true, summary: true },
        });
        return pickIds.flatMap((id) => rows.filter((r) => r.id === id)).map((a) => ({ ...a, url: articleUrl(a.slug) }));
    } catch (e) {
        log.warn("report article selection failed", { err: e });
        return [];
    }
}

/** Everything the weekly report (PDF and email) shows, for the week starting `weekStart`. */
export async function buildWeeklyReport(userId: number, weekStart: string, tz: string): Promise<WeeklyReportData> {
    const weekEnd = addDaysToKey(weekStart, 6);
    const heatmapStart = addDaysToKey(weekEnd, -(HEATMAP_WEEKS * 7 - 1));
    const [user, habits, commits] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, preference: { select: { palette: true } } } }),
        prisma.habit.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
        prisma.commit.findMany({ where: { userId }, select: { habitId: true, timestamp: true } }),
    ]);

    const prevStart = addDaysToKey(weekStart, -7);
    const inRange = (key: string, from: string, to: string) => key >= from && key <= to;
    const dayCounts = new Map<string, number>();
    const habitDays = new Map<number, Set<string>>();
    const perHabit = new Map<number, { commits: number; previous: number }>();

    for (const c of commits) {
        const key = localDayKey(c.timestamp, tz);
        if (key > weekEnd) continue; // report reflects the week as of its end
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
        if (!habitDays.has(c.habitId)) habitDays.set(c.habitId, new Set());
        habitDays.get(c.habitId)!.add(key);
        const h = perHabit.get(c.habitId) ?? { commits: 0, previous: 0 };
        if (inRange(key, weekStart, weekEnd)) h.commits++;
        else if (inRange(key, prevStart, addDaysToKey(weekStart, -1))) h.previous++;
        perHabit.set(c.habitId, h);
    }

    const days = WEEKDAY_NAMES.map((weekday, i) => {
        const date = addDaysToKey(weekStart, i);
        return { date, weekday, count: dayCounts.get(date) ?? 0 };
    });
    const habitRows = habits
        .map((h) => {
            const set = habitDays.get(h.id) ?? new Set<string>();
            const counts = perHabit.get(h.id) ?? { commits: 0, previous: 0 };
            return { name: h.name, ...counts, currentStreak: currentStreak(set, addDaysToKey(weekEnd, 1)), longestStreak: longestStreak(set) };
        })
        .sort((a, b) => b.commits - a.commits || b.currentStreak - a.currentStreak);

    const totals = {
        commits: days.reduce((s, d) => s + d.count, 0),
        previous: habitRows.reduce((s, h) => s + h.previous, 0),
        activeDays: days.filter((d) => d.count > 0).length,
    };
    const heatmap = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
        const date = addDaysToKey(heatmapStart, i);
        return { date, count: dayCounts.get(date) ?? 0 };
    });
    const week = { key: isoWeekKey(weekStart), start: weekStart, end: weekEnd, label: formatRange(weekStart, weekEnd) };
    const partial = { totals, days, habits: habitRows, week };

    return {
        email: user.email,
        palette: user.preference?.palette ?? "classic",
        week,
        totals,
        days,
        habits: habitRows,
        bestHabit: habitRows[0]?.commits ? habitRows[0].name : null,
        insight: weeklyInsight(partial),
        heatmap,
        articles: await pickArticles(partial),
    };
}

/** For tests and previews: the UTC instant at which the report week starts. */
export const weekStartInstant = (weekStart: string, tz: string) => zonedStartOfDay(weekStart, tz);
