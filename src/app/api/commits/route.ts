export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/commits?habitName=&limit=
export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    const { searchParams } = new URL(req.url);
    const habitName = searchParams.get("habitName");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = { userId: payload.userId };
    if (habitName) {
      const habit = await prisma.habit.findUnique({
        where: { userId_name: { userId: payload.userId, name: habitName } },
      });
      if (habit) where.habitId = habit.id;
      else return Response.json([]);
    }

    const commits = await prisma.commit.findMany({
      where,
      include: { habit: { select: { name: true } } },
      orderBy: { timestamp: "desc" },
      take: Math.min(limit, 1000),
    });

    return Response.json(
      commits.map((c) => ({
        id: String(c.id),
        habitName: c.habit.name,
        message: c.message,
        timestamp: c.timestamp.toISOString(),
        synced: true,
      }))
    );
  } catch (e: unknown) {
    if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
    console.error("[GET /api/commits]", e);
    return serverError();
  }
}
