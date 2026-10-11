export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { buildVersion, checkDependencies } from "@/server/obs/health";

// GET /api/health — liveness of the app and its dependencies, for uptime probes.
// 200 {"status":"ok"} when everything responds; 503 {"status":"degraded"} otherwise.
export const GET = withRoute(
    { name: "GET /api/health", rateLimit: ({ req }) => rateLimits.ip(req, "health", rateLimits.perMinute(60)) },
    async () => {
        const checks = await checkDependencies();
        const ok = Object.values(checks).every((c) => c.ok);
        return Response.json(
            {
                status: ok ? "ok" : "degraded",
                version: buildVersion(),
                time: new Date().toISOString(),
                checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, { ok: v.ok, latencyMs: v.latencyMs }])),
            },
            { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
        );
    },
);
