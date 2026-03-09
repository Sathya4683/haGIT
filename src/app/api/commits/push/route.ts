export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, badRequest, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/commits/push
// Body: { commits: [{ habitName, message, timestamp }] }
export async function POST(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    const body = await req.json();
    const commits: { habitName: string; message: string; timestamp: string }[] = body.commits;

    if (!Array.isArray(commits) || commits.length === 0)
      return badRequest("commits array is required.");

    const results = [];
    for (const c of commits) {
      const { habitName, message, timestamp } = c;
      if (!habitName || !message) return badRequest("habitName and message are required.");

      // Upsert habit
      let habit = await prisma.habit.findUnique({
        where: { userId_name: { userId: payload.userId, name: habitName } },
      });
      if (!habit) {
        habit = await prisma.habit.create({ data: { name: habitName, userId: payload.userId } });
      }

      const commit = await prisma.commit.create({
        data: {
          message,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          habitId: habit.id,
          userId: payload.userId,
        },
      });
      results.push({
        id: commit.id,
        message: commit.message,
        habitName,
        timestamp: commit.timestamp.toISOString(),
        synced: true,
      });
    }

    return Response.json({ success: true, commits: results }, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
    console.error("[POST /api/commits/push]", e);
    return serverError();
  }
}
