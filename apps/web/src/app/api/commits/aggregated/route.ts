export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { localDayKey } from "@/lib/datetime";
import { withRoute } from "@/server/http/withRoute";
import { timezone } from "@/server/http/schemas";

// GET /api/commits/aggregated?tz=<IANA>
// Returns [{ date: "yyyy-MM-dd", count: N }], bucketed by the caller's local calendar day.
export const GET = withRoute(
    {
        name: "GET /api/commits/aggregated",
        auth: "user",
        query: z.object({ tz: timezone }),
        rateLimit: ({ user }) => rateLimits.userRead(user.userId),
    },
    async ({ user, query }) => {
        const commits = await prisma.commit.findMany({
            where: { userId: user.userId },
            select: { timestamp: true },
        });

        const countMap: Record<string, number> = {};
        for (const c of commits) {
            const d = localDayKey(c.timestamp, query.tz);
            countMap[d] = (countMap[d] || 0) + 1;
        }

        const result = Object.entries(countMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return Response.json(result);
    },
);
