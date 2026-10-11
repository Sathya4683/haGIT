import { Prisma, type NotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 3;
/** A PENDING row older than this belongs to a run that died mid-send. */
const STALE_PENDING_MS = 15 * 60 * 1000;

export type Claim = { id: number } | null;

/**
 * Claims the right to deliver `kind` for `periodKey` to a user. Exactly one caller gets a claim:
 * the insert is guarded by a unique index, and retries of failed (or abandoned) deliveries are
 * claimed with a compare-and-set on the attempt counter.
 */
export async function claimDelivery(userId: number, kind: NotificationKind, periodKey: string, now = new Date()): Promise<Claim> {
    try {
        const row = await prisma.notificationLog.create({ data: { userId, kind, periodKey } });
        return { id: row.id };
    } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }

    const existing = await prisma.notificationLog.findUnique({ where: { userId_kind_periodKey: { userId, kind, periodKey } } });
    if (!existing || existing.attempts >= MAX_ATTEMPTS) return null;
    const retryable =
        existing.status === "FAILED" ||
        (existing.status === "PENDING" && now.getTime() - existing.updatedAt.getTime() > STALE_PENDING_MS);
    if (!retryable) return null;

    const { count } = await prisma.notificationLog.updateMany({
        where: { id: existing.id, attempts: existing.attempts, status: existing.status },
        data: { status: "PENDING", attempts: { increment: 1 }, error: null },
    });
    return count === 1 ? { id: existing.id } : null;
}

export async function completeDelivery(claim: { id: number }, status: "SENT" | "SKIPPED" | "FAILED", error?: unknown) {
    await prisma.notificationLog.update({
        where: { id: claim.id },
        data: { status, error: error ? String((error as Error).message ?? error).slice(0, 500) : null },
    });
}

/** Records a job execution for the admin console and the /api/metrics job-health gauges. */
export async function recordJobRun<T extends Record<string, unknown>>(job: string, run: () => Promise<T>): Promise<T> {
    const started = new Date();
    const row = await prisma.jobRun.create({ data: { job, status: "running", startedAt: started } });
    try {
        const stats = await run();
        await prisma.jobRun.update({
            where: { id: row.id },
            data: { status: "success", finishedAt: new Date(), durationMs: Date.now() - started.getTime(), stats: stats as Prisma.InputJsonValue },
        });
        return stats;
    } catch (e) {
        await prisma.jobRun.update({
            where: { id: row.id },
            data: { status: "failed", finishedAt: new Date(), durationMs: Date.now() - started.getTime(), error: String((e as Error).message ?? e).slice(0, 1000) },
        });
        throw e;
    }
}
