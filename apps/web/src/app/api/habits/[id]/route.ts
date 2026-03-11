export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, notFound, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/habits/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return notFound();

    const habit = await prisma.habit.findFirst({
      where: { id, userId: payload.userId },
      include: {
        commits: { orderBy: { timestamp: "desc" } },
        _count: { select: { commits: true } },
      },
    });
    if (!habit) return notFound("Habit not found.");

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
  } catch (e: unknown) {
    if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
    console.error("[GET /api/habits/:id]", e);
    return serverError();
  }
}

// PATCH /api/habits/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return notFound();
    const { name } = await req.json();
    if (!name?.trim()) return badRequest("Name is required.");

    const habit = await prisma.habit.findFirst({ where: { id, userId: payload.userId } });
    if (!habit) return notFound("Habit not found.");

    const updated = await prisma.habit.update({ where: { id }, data: { name: name.trim() } });
    return Response.json({ id: updated.id, name: updated.name, createdAt: updated.createdAt.toISOString() });
  } catch (e: unknown) {
    if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
    console.error("[PATCH /api/habits/:id]", e);
    return serverError();
  }
}

// DELETE /api/habits/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return notFound();

    const habit = await prisma.habit.findFirst({ where: { id, userId: payload.userId } });
    if (!habit) return notFound("Habit not found.");

    await prisma.habit.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
    console.error("[DELETE /api/habits/:id]", e);
    return serverError();
  }
}
