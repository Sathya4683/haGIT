export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { localDayKey, isValidTimezone } from "@/lib/datetime";

// GET /api/commits/aggregated
// Returns [{ date: "yyyy-MM-dd", count: N }]
// Accepts optional ?tz=<IANA> so each user's commit lands on the calendar day
// they actually committed on. Defaults to "UTC" for backward compatibility.
export async function GET(req: NextRequest) {
    try {
        const payload = requireAuth(req);

        const requestedTz = new URL(req.url).searchParams.get("tz") ?? "UTC";
        const tz = isValidTimezone(requestedTz) ? requestedTz : "UTC";

        const commits = await prisma.commit.findMany({
            where: { userId: payload.userId },
            select: { timestamp: true },
        });

        const countMap: Record<string, number> = {};
        for (const c of commits) {
            const d = localDayKey(c.timestamp, tz);
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
