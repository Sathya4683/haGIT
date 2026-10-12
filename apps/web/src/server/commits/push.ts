import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PushInput {
    habitName: string;
    message: string;
    timestamp?: Date;
    /** Stable client-side id; a retried push with the same id is not stored twice. */
    clientId?: string;
}

export interface PushedCommit {
    id: number;
    habitName: string;
    message: string;
    timestamp: string;
    clientId: string | null;
    synced: true;
}

export interface PushResult {
    commits: PushedCommit[];
    created: number;
    duplicates: number;
}

function isUniqueViolation(e: unknown) {
    return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Stores a batch of commits atomically, creating missing habits on the way.
 * Either every commit is stored (or recognised as an earlier retry) or nothing is.
 */
export async function pushCommits(userId: number, inputs: PushInput[], now = new Date()): Promise<PushResult> {
    const run = () =>
        prisma.$transaction(async (tx) => {
            const names = Array.from(new Set(inputs.map((i) => i.habitName)));
            const habitIdByName = new Map<string, number>();
            for (const name of names) {
                const habit = await tx.habit.upsert({
                    where: { userId_name: { userId, name } },
                    create: { userId, name },
                    update: {},
                    select: { id: true },
                });
                habitIdByName.set(name, habit.id);
            }
            const nameByHabitId = new Map(Array.from(habitIdByName, ([name, id]) => [id, name]));

            const select = { id: true, message: true, timestamp: true, clientId: true, habitId: true } as const;
            const created = await tx.commit.createManyAndReturn({
                data: inputs.map((i) => ({
                    userId,
                    habitId: habitIdByName.get(i.habitName)!,
                    message: i.message,
                    timestamp: i.timestamp ?? now,
                    clientId: i.clientId ?? null,
                })),
                skipDuplicates: true,
                select,
            });

            // Commits skipped as duplicates were stored by an earlier attempt; report them as synced.
            const createdClientIds = new Set(created.map((c) => c.clientId));
            const retriedIds = inputs
                .map((i) => i.clientId)
                .filter((id): id is string => Boolean(id) && !createdClientIds.has(id!));
            const existing = retriedIds.length
                ? await tx.commit.findMany({ where: { userId, clientId: { in: retriedIds } }, select })
                : [];

            const toDto = (c: (typeof created)[number]): PushedCommit => ({
                id: c.id,
                habitName: nameByHabitId.get(c.habitId) ?? "",
                message: c.message,
                timestamp: c.timestamp.toISOString(),
                clientId: c.clientId,
                synced: true,
            });

            return {
                commits: [...created, ...existing].map(toDto),
                created: created.length,
                duplicates: existing.length,
            };
        });

    try {
        return await run();
    } catch (e) {
        // Two concurrent pushes creating the same habit can race on the unique index; the retry
        // finds the habit the other request created.
        if (isUniqueViolation(e)) return run();
        throw e;
    }
}
