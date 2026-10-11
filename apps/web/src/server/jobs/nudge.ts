import { currentStreak } from "@hagit/coach-core";
import { prisma } from "@/lib/prisma";
import { addDaysToKey, localDayKey, zonedDayRange, zonedParts, zonedStartOfDay } from "@/lib/datetime";
import { publishNtfy, type NtfyMessage } from "@/server/notify/ntfy";
import { appUrl } from "@/server/kb/service";
import { getLogger } from "@/server/obs/logger";
import { claimDelivery, completeDelivery } from "./delivery";

const log = getLogger("job");
const STREAK_LOOKBACK_DAYS = 120;

export interface OpenHabit {
    name: string;
    /** Consecutive days up to yesterday: what a commit today would extend. */
    streak: number;
}

/** Composes the nightly reminder, or null when there is nothing to remind about. */
export function composeNudge(open: OpenHabit[], dashboardUrl: string): Omit<NtfyMessage, "topic"> | null {
    if (open.length === 0) return null;
    const sorted = [...open].sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));
    const atRisk = sorted.filter((h) => h.streak >= 2);
    const lines = sorted.slice(0, 6).map((h) => `• ${h.name}${h.streak >= 2 ? ` (${h.streak}-day streak)` : ""}`);
    if (sorted.length > 6) lines.push(`• …and ${sorted.length - 6} more`);
    lines.push("", atRisk.length ? "One small commit keeps the streak alive." : "A two-minute version still counts.");

    return {
        title: open.length === 1 ? `${open[0].name} is still open today` : `${open.length} habits still open today`,
        message: lines.join("\n"),
        tags: [atRisk.length ? "fire" : "crescent_moon"],
        priority: (atRisk[0]?.streak ?? 0) >= 7 ? 4 : 3,
        click: dashboardUrl,
        actions: [{ action: "view", label: "Open haGIT", url: dashboardUrl, clear: true }],
    };
}

/** Habits with no commit on the local date `dateKey`, with their streak up to yesterday. */
export async function findOpenHabits(userId: number, dateKey: string, tz: string): Promise<OpenHabit[]> {
    const { start, end } = zonedDayRange(dateKey, tz);
    const since = zonedStartOfDay(addDaysToKey(dateKey, -STREAK_LOOKBACK_DAYS), tz);
    const [habits, commits] = await Promise.all([
        prisma.habit.findMany({ where: { userId }, select: { id: true, name: true } }),
        prisma.commit.findMany({ where: { userId, timestamp: { gte: since, lt: end } }, select: { habitId: true, timestamp: true } }),
    ]);

    const days = new Map<number, Set<string>>();
    const doneToday = new Set<number>();
    for (const c of commits) {
        if (c.timestamp >= start) doneToday.add(c.habitId);
        if (!days.has(c.habitId)) days.set(c.habitId, new Set());
        days.get(c.habitId)!.add(localDayKey(c.timestamp, tz));
    }
    return habits
        .filter((h) => !doneToday.has(h.id))
        .map((h) => ({ name: h.name, streak: currentStreak(days.get(h.id) ?? new Set(), dateKey) }));
}

export interface NudgeStats extends Record<string, unknown> {
    candidates: number;
    due: number;
    sent: number;
    skipped: number;
    failed: number;
    deferred: number;
}

/**
 * Sends tonight's reminder to every user whose local time has passed their reminder hour and who
 * hasn't been handled today. Missed ticks catch up until local midnight.
 */
export async function runNightlyNudges(now: Date, deadline: number): Promise<NudgeStats> {
    const prefs = await prisma.userPreference.findMany({
        where: { nudgeEnabled: true, ntfyTopic: { not: null } },
        select: { userId: true, timezone: true, nudgeHour: true, ntfyTopic: true },
    });
    const stats: NudgeStats = { candidates: prefs.length, due: 0, sent: 0, skipped: 0, failed: 0, deferred: 0 };
    const dashboard = `${appUrl()}/dashboard`;

    for (const p of prefs) {
        const local = zonedParts(now, p.timezone);
        if (local.hour < p.nudgeHour) continue;
        stats.due++;
        if (Date.now() > deadline) {
            stats.deferred++;
            continue;
        }
        const claim = await claimDelivery(p.userId, "NUDGE", local.dateKey, now);
        if (!claim) continue;
        try {
            const nudge = composeNudge(await findOpenHabits(p.userId, local.dateKey, p.timezone), dashboard);
            if (!nudge) {
                await completeDelivery(claim, "SKIPPED");
                stats.skipped++;
                continue;
            }
            await publishNtfy({ topic: p.ntfyTopic!, ...nudge });
            await completeDelivery(claim, "SENT");
            stats.sent++;
        } catch (e) {
            await completeDelivery(claim, "FAILED", e);
            stats.failed++;
            log.warn("nudge delivery failed", { job: "nightly-nudge", userId: p.userId, err: e });
        }
    }
    return stats;
}
