export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/commits/aggregated
// Returns [{ date: "yyyy-MM-dd", count: N }]
export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);

    const commits = await prisma.commit.findMany({
      where: { userId: payload.userId },
      select: { timestamp: true },
    });

    const countMap: Record<string, number> = {};
    for (const c of commits) {
      const d = c.timestamp.toISOString().slice(0, 10);
      countMap[d] = (countMap[d] || 0) + 1;
    }

    const result = Object.entries(countMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return Response.json(result);
  } catch (e: unknown) {
    if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
    console.error("[GET /api/commits/aggregated]", e);
    return serverError();
  }
}
