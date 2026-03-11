export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/commits/by-habit
// Returns [{ habitId, habitName, commitCount }]
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
                habitId: h.id,
                habitName: h.name,
                commitCount: h._count.commits,
            }))
        );
    } catch (e: unknown) {
        if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
        console.error("[GET /api/commits/by-habit]", e);
        return serverError();
    }
}
