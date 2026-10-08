import type { CheckIn, HabitData } from "@hagit/coach-core";
import { prisma } from "@/lib/prisma";

/**
 * Coach data source scoped to one user. The userId comes from the verified
 * JWT, never from the model, so tool calls can only see this user's habits.
 * Read-only: the web coach gets no write tools.
 */
export function prismaHabitData(userId: number): HabitData {
    // One coach run calls several tools over the same history; query it once per request.
    const checkIns = new Map<string, Promise<CheckIn[]>>();

    return {
        async listHabits() {
            const habits = await prisma.habit.findMany({
                where: { userId },
                include: { _count: { select: { commits: true } } },
                orderBy: { createdAt: "asc" },
            });
            return habits.map((h) => ({ name: h.name, createdAt: h.createdAt.toISOString(), commitCount: h._count.commits }));
        },

        getCheckIns(habit) {
            const key = habit ?? "";
            let pending = checkIns.get(key);
            if (!pending) {
                pending = prisma.commit
                    .findMany({
                        where: { userId, ...(habit && { habit: { name: habit } }) },
                        select: { message: true, timestamp: true, habit: { select: { name: true } } },
                    })
                    .then((rows) => rows.map((c) => ({ habit: c.habit.name, message: c.message, timestamp: c.timestamp.toISOString() })));
                checkIns.set(key, pending);
            }
            return pending;
        },
    };
}
