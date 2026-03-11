export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/habits
export async function GET(req: NextRequest) {
    try {
        const payload = requireAuth(req);
        const habits = await prisma.habit.findMany({
            where: { userId: payload.userId },
            include: { _count: { select: { commits: true } } },
            orderBy: { createdAt: "asc" },
        });
        return Response.json(
            habits.map((h) => ({
                id: h.id,
                name: h.name,
                createdAt: h.createdAt.toISOString(),
                commitCount: h._count.commits,
            }))
        );
    } catch (e: unknown) {
        if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
        console.error("[GET /api/habits]", e);
        return serverError();
    }
}

// POST /api/habits
export async function POST(req: NextRequest) {
    try {
        const payload = requireAuth(req);
        const { name } = await req.json();
        if (!name?.trim()) return badRequest("Habit name is required.");

        const existing = await prisma.habit.findUnique({
            where: { userId_name: { userId: payload.userId, name: name.trim() } },
        });
        if (existing) return badRequest("A habit with this name already exists.");

        const habit = await prisma.habit.create({
            data: { name: name.trim(), userId: payload.userId },
        });
        return Response.json({ id: habit.id, name: habit.name, createdAt: habit.createdAt.toISOString(), commitCount: 0 }, { status: 201 });
    } catch (e: unknown) {
        if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
        console.error("[POST /api/habits]", e);
        return serverError();
    }
}

// DELETE /api/habits
export async function DELETE(req: NextRequest) {
    try {
        const payload = requireAuth(req);
        const { name } = await req.json();

        if (!name?.trim()) {
            return badRequest("Habit name is required.");
        }

        const habit = await prisma.habit.findUnique({
            where: {
                userId_name: {
                    userId: payload.userId,
                    name: name.trim(),
                },
            },
        });

        if (!habit) {
            return badRequest("Habit not found.");
        }

        await prisma.habit.delete({
            where: {
                userId_name: {
                    userId: payload.userId,
                    name: name.trim(),
                },
            },
        });

        return Response.json({
            success: true,
            message: `Habit "${name}" deleted.`,
        });
    } catch (e: unknown) {
        if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
        console.error("[DELETE /api/habits]", e);
        return serverError();
    }
}
