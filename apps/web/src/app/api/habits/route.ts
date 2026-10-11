export const runtime = "nodejs";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { notFoundError } from "@/server/http/errors";
import { habitName } from "@/server/http/schemas";

const nameBody = z.object({ name: habitName });

// GET /api/habits
export const GET = withRoute(
    { name: "GET /api/habits", auth: "user", rateLimit: ({ user }) => rateLimits.userRead(user.userId) },
    async ({ user }) => {
        const habits = await prisma.habit.findMany({
            where: { userId: user.userId },
            include: { _count: { select: { commits: true } } },
            orderBy: { createdAt: "asc" },
        });
        return Response.json(
            habits.map((h) => ({
                id: h.id,
                name: h.name,
                createdAt: h.createdAt.toISOString(),
                commitCount: h._count.commits,
            })),
        );
    },
);

// POST /api/habits
export const POST = withRoute(
    {
        name: "POST /api/habits",
        auth: "user",
        body: nameBody,
        rateLimit: ({ user }) => rateLimits.userWrite(user.userId, "habits"),
        conflictMessage: "A habit with this name already exists.",
    },
    async ({ user, body }) => {
        const habit = await prisma.habit.create({ data: { name: body.name, userId: user.userId } });
        return Response.json(
            { id: habit.id, name: habit.name, createdAt: habit.createdAt.toISOString(), commitCount: 0 },
            { status: 201 },
        );
    },
);

// DELETE /api/habits  (by name; used by the CLI)
export const DELETE = withRoute(
    {
        name: "DELETE /api/habits",
        auth: "user",
        body: nameBody,
        rateLimit: ({ user }) => rateLimits.userWrite(user.userId, "habits"),
    },
    async ({ user, body }) => {
        const { count } = await prisma.habit.deleteMany({ where: { userId: user.userId, name: body.name } });
        if (count === 0) throw notFoundError("Habit not found.");
        return Response.json({ success: true, message: `Habit "${body.name}" deleted.` });
    },
);
