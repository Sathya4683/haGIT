export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { zonedDayRange } from "@/lib/datetime";
import { withRoute } from "@/server/http/withRoute";
import { dateKey, timezone } from "@/server/http/schemas";

const query = z.object({
    habitName: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(1000).catch(50),
    /** Local calendar day (with `tz`) to return commits for. */
    date: dateKey.optional(),
    tz: timezone,
});

// GET /api/commits?habitName=&limit=&date=YYYY-MM-DD&tz=
export const GET = withRoute(
    { name: "GET /api/commits", auth: "user", query, rateLimit: ({ user }) => rateLimits.userRead(user.userId) },
    async ({ user, query }) => {
        const range = query.date ? zonedDayRange(query.date, query.tz) : null;
        const commits = await prisma.commit.findMany({
            where: {
                userId: user.userId,
                ...(query.habitName && { habit: { name: query.habitName } }),
                ...(range && { timestamp: { gte: range.start, lt: range.end } }),
            },
            include: { habit: { select: { name: true } } },
            orderBy: { timestamp: "desc" },
            take: query.limit,
        });

        return Response.json(
            commits.map((c) => ({
                id: String(c.id),
                habitName: c.habit.name,
                message: c.message,
                timestamp: c.timestamp.toISOString(),
                synced: true,
            })),
        );
    },
);
