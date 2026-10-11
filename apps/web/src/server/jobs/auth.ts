import { timingSafeEqual } from "node:crypto";
import { Receiver } from "@upstash/qstash";

function constantTimeEquals(a: string, b: string) {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Scheduler authentication: a valid Upstash QStash signature (production schedule), or
 * `Authorization: Bearer CRON_SECRET` (local scheduler container, manual runs, CI fallback).
 */
export async function isAuthorizedScheduler(req: Request, rawBody: string): Promise<boolean> {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    if (secret && auth?.startsWith("Bearer ") && constantTimeEquals(auth.slice(7), secret)) return true;

    const signature = req.headers.get("upstash-signature");
    const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const next = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!signature || !current || !next) return false;
    try {
        return await new Receiver({ currentSigningKey: current, nextSigningKey: next }).verify({ signature, body: rawBody });
    } catch {
        return false;
    }
}
