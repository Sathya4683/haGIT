export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { timingSafeEqual } from "node:crypto";
import { withRoute } from "@/server/http/withRoute";
import { notFoundError, unauthorizedError } from "@/server/http/errors";
import { collectMetrics } from "@/server/obs/metrics";

const CACHE_MS = 30_000;
let cached: { at: number; body: string } | null = null;

function tokenMatches(header: string | null, expected: string) {
    const provided = header?.startsWith("Bearer ") ? header.slice(7) : "";
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

// GET /api/metrics — Prometheus scrape target (Authorization: Bearer METRICS_TOKEN).
// Disabled (404) when METRICS_TOKEN is not configured.
export const GET = withRoute({ name: "GET /api/metrics" }, async ({ req }) => {
    const token = process.env.METRICS_TOKEN;
    if (!token) throw notFoundError();
    if (!tokenMatches(req.headers.get("authorization"), token)) throw unauthorizedError();

    if (!cached || Date.now() - cached.at > CACHE_MS) cached = { at: Date.now(), body: await collectMetrics() };
    return new Response(cached.body, {
        headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8", "Cache-Control": "no-store" },
    });
});
