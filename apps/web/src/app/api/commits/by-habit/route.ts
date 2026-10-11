export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";

// GET /api/commits/by-habit
// Returns [{ habitId, habitName, commitCount }]
export const GET = withRoute(
    { name: "GET /api/commits/by-habit", auth: "user", rateLimit: ({ user }) => rateLimits.userRead(user.userId) },
    async ({ user }) => {
        const habits = await prisma.habit.findMany({
            where: { userId: user.userId },
            include: { _count: { select: { commits: true } } },
            orderBy: { createdAt: "asc" },
        });

        return Response.json(
            habits.map((h) => ({
                habitId: h.id,
                habitName: h.name,
                commitCount: h._count.commits,
            })),
        );
    },
);
