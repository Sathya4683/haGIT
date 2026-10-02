export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { limitUserOperation, rateLimitExceeded } from "@/lib/rate-limit";

// DELETE /api/commits/by-habit/:habitId
export async function DELETE(req: NextRequest, { params }: { params: { habitId: string } }) {
    try {
        const payload = requireAuth(req);
        const rateLimit = await limitUserOperation(payload.userId, "commits");
        if (!rateLimit.allowed) return rateLimitExceeded(rateLimit.retryAfter);
        const habitId = parseInt(params.habitId, 10);
        if (isNaN(habitId)) return notFound();

        const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: payload.userId } });
        if (!habit) return notFound("Habit not found.");

        const { count } = await prisma.commit.deleteMany({ where: { habitId, userId: payload.userId } });
        return Response.json({ success: true, deletedCount: count });
    } catch (e: unknown) {
        if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
        console.error("[DELETE /api/commits/by-habit/:habitId]", e);
        return serverError();
    }
}
