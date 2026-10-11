export const runtime = "nodejs";

import { z } from "zod";
import { currentStreak, longestStreak } from "@hagit/coach-core";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { localDayKey } from "@/lib/datetime";
import { withRoute } from "@/server/http/withRoute";
import { timezone } from "@/server/http/schemas";

// GET /api/commits/by-habit?tz=<IANA>
// Returns [{ habitId, habitName, commitCount, currentStreak, longestStreak, committedToday, lastCommitAt }]
// Streaks count consecutive local calendar days with at least one commit.
export const GET = withRoute(
    {
        name: "GET /api/commits/by-habit",
        auth: "user",
        query: z.object({ tz: timezone }),
        rateLimit: ({ user }) => rateLimits.userRead(user.userId),
    },
    async ({ user, query }) => {
        const [habits, commits] = await Promise.all([
            prisma.habit.findMany({ where: { userId: user.userId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
            prisma.commit.findMany({ where: { userId: user.userId }, select: { habitId: true, timestamp: true } }),
        ]);

        const days = new Map<number, Set<string>>();
        const counts = new Map<number, number>();
        const last = new Map<number, Date>();
        for (const c of commits) {
            if (!days.has(c.habitId)) days.set(c.habitId, new Set());
            days.get(c.habitId)!.add(localDayKey(c.timestamp, query.tz));
            counts.set(c.habitId, (counts.get(c.habitId) ?? 0) + 1);
            if (!last.has(c.habitId) || c.timestamp > last.get(c.habitId)!) last.set(c.habitId, c.timestamp);
        }

        const today = localDayKey(new Date(), query.tz);
        return Response.json(
            habits.map((h) => {
                const active = days.get(h.id) ?? new Set<string>();
                return {
                    habitId: h.id,
                    habitName: h.name,
                    commitCount: counts.get(h.id) ?? 0,
                    currentStreak: currentStreak(active, today),
                    longestStreak: longestStreak(active),
                    committedToday: active.has(today),
                    lastCommitAt: last.get(h.id)?.toISOString() ?? null,
                };
            }),
        );
    },
);
