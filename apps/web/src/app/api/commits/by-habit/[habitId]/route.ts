export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { notFoundError } from "@/server/http/errors";
import { idParam } from "@/server/http/schemas";

// DELETE /api/commits/by-habit/:habitId
export const DELETE = withRoute<"user", undefined, undefined, { habitId: string }>(
    {
        name: "DELETE /api/commits/by-habit/:habitId",
        auth: "user",
        rateLimit: ({ user }) => rateLimits.userWrite(user.userId, "commits"),
    },
    async ({ user, params }) => {
        const habitId = idParam.safeParse(params.habitId);
        if (!habitId.success) throw notFoundError("Habit not found.");

        const habit = await prisma.habit.findFirst({ where: { id: habitId.data, userId: user.userId } });
        if (!habit) throw notFoundError("Habit not found.");

        const { count } = await prisma.commit.deleteMany({ where: { habitId: habit.id, userId: user.userId } });
        return Response.json({ success: true, deletedCount: count });
    },
);
