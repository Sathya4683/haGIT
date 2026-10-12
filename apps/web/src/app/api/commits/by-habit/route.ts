export const runtime = "nodejs";

import { z } from "zod";
import { currentStreak, longestStreak } from "@hagit/coach-core";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { addDaysToKey, localDayKey } from "@/lib/datetime";
import { withRoute } from "@/server/http/withRoute";
import { timezone } from "@/server/http/schemas";

const RECENT_DAYS = 14;

// GET /api/commits/by-habit?tz=<IANA>
// Returns [{ habitId, habitName, createdAt, commitCount, currentStreak, longestStreak, committedToday,
//            lastCommitAt, recent }] where `recent` holds commit counts for the last 14 local days
// (oldest first, today last). Streaks count consecutive local days with at least one commit.
export const GET = withRoute(
    {
        name: "GET /api/commits/by-habit",
        auth: "user",
        query: z.object({ tz: timezone }),
        rateLimit: ({ user }) => rateLimits.userRead(user.userId),
    },
    async ({ user, query }) => {
        const [habits, commits] = await Promise.all([
            prisma.habit.findMany({
                where: { userId: user.userId },
                orderBy: { createdAt: "asc" },
                select: { id: true, name: true, createdAt: true },
            }),
            prisma.commit.findMany({ where: { userId: user.userId }, select: { habitId: true, timestamp: true } }),
        ]);

        const days = new Map<number, Set<string>>();
        const perDay = new Map<string, number>(); // `${habitId}|${dayKey}`
        const counts = new Map<number, number>();
        const last = new Map<number, Date>();
        for (const c of commits) {
            if (!days.has(c.habitId)) days.set(c.habitId, new Set());
            const key = localDayKey(c.timestamp, query.tz);
            days.get(c.habitId)!.add(key);
            perDay.set(`${c.habitId}|${key}`, (perDay.get(`${c.habitId}|${key}`) ?? 0) + 1);
            counts.set(c.habitId, (counts.get(c.habitId) ?? 0) + 1);
            if (!last.has(c.habitId) || c.timestamp > last.get(c.habitId)!) last.set(c.habitId, c.timestamp);
        }

        const today = localDayKey(new Date(), query.tz);
        const lastDays = Array.from({ length: RECENT_DAYS }, (_, i) => addDaysToKey(today, i - RECENT_DAYS + 1));
        return Response.json(
            habits.map((h) => {
                const active = days.get(h.id) ?? new Set<string>();
                return {
                    habitId: h.id,
                    habitName: h.name,
                    createdAt: h.createdAt.toISOString(),
                    commitCount: counts.get(h.id) ?? 0,
                    currentStreak: currentStreak(active, today),
                    longestStreak: longestStreak(active),
                    committedToday: active.has(today),
                    lastCommitAt: last.get(h.id)?.toISOString() ?? null,
                    recent: lastDays.map((day) => perDay.get(`${h.id}|${day}`) ?? 0),
                };
            }),
        );
    },
);
