export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { notFoundError } from "@/server/http/errors";
import { habitName, idParam } from "@/server/http/schemas";

type Params = { id: string };

function parseId(params: Params) {
    const id = idParam.safeParse(params.id);
    if (!id.success) throw notFoundError("Habit not found.");
    return id.data;
}

// GET /api/habits/:id
export const GET = withRoute<"user", undefined, undefined, Params>(
    { name: "GET /api/habits/:id", auth: "user", rateLimit: ({ user }) => rateLimits.userRead(user.userId) },
    async ({ user, params }) => {
        const habit = await prisma.habit.findFirst({
            where: { id: parseId(params), userId: user.userId },
            include: {
                commits: { orderBy: { timestamp: "desc" } },
                _count: { select: { commits: true } },
            },
        });
        if (!habit) throw notFoundError("Habit not found.");

        return Response.json({
            id: habit.id,
            name: habit.name,
            createdAt: habit.createdAt.toISOString(),
            commitCount: habit._count.commits,
            commits: habit.commits.map((c) => ({
                id: c.id,
                message: c.message,
                timestamp: c.timestamp.toISOString(),
                createdAt: c.createdAt.toISOString(),
            })),
        });
    },
);

// PATCH /api/habits/:id
export const PATCH = withRoute<"user", { name: string }, undefined, Params>(
    {
        name: "PATCH /api/habits/:id",
        auth: "user",
        body: z.object({ name: habitName }),
        rateLimit: ({ user }) => rateLimits.userWrite(user.userId, "habits"),
        conflictMessage: "A habit with this name already exists.",
    },
    async ({ user, params, body }) => {
        const id = parseId(params);
        const { count } = await prisma.habit.updateMany({
            where: { id, userId: user.userId },
            data: { name: body.name },
        });
        if (count === 0) throw notFoundError("Habit not found.");
        const updated = await prisma.habit.findUniqueOrThrow({ where: { id } });
        return Response.json({ id: updated.id, name: updated.name, createdAt: updated.createdAt.toISOString() });
    },
);

// DELETE /api/habits/:id
export const DELETE = withRoute<"user", undefined, undefined, Params>(
    {
        name: "DELETE /api/habits/:id",
        auth: "user",
        rateLimit: ({ user }) => rateLimits.userWrite(user.userId, "habits"),
    },
    async ({ user, params }) => {
        const { count } = await prisma.habit.deleteMany({ where: { id: parseId(params), userId: user.userId } });
        if (count === 0) throw notFoundError("Habit not found.");
        return Response.json({ success: true });
    },
);
