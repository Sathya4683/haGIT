import { prisma } from "@/lib/prisma";
import { pingRedis } from "@/lib/rate-limit";

export interface DependencyCheck {
    ok: boolean;
    latencyMs: number;
    error?: string;
}

async function timed(check: () => Promise<unknown>, timeoutMs = 2500): Promise<DependencyCheck> {
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            check(),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
            }),
        ]);
        return { ok: true, latencyMs: Math.round(performance.now() - started) };
    } catch (e) {
        return { ok: false, latencyMs: Math.round(performance.now() - started), error: (e as Error).message.slice(0, 120) };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function checkDependencies() {
    const [database, redis] = await Promise.all([timed(() => prisma.$queryRaw`SELECT 1`), timed(() => pingRedis())]);
    return { database, redis };
}

export const buildVersion = () => (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7);
