export const runtime = "nodejs";

import { z } from "zod";
import { rateLimits } from "@/lib/rate-limit";
import { withRoute } from "@/server/http/withRoute";
import { getLogger, type Source } from "@/server/obs/logger";

const text = (max: number) => z.string().max(4000).transform((s) => s.slice(0, max));

const event = z.object({
    type: z.enum(["error", "command", "vital", "event"]),
    name: text(80),
    message: text(300).optional(),
    code: text(60).optional(),
    route: text(120).optional(),
    durationMs: z.number().min(0).max(600_000).optional(),
    value: z.number().optional(),
    ok: z.boolean().optional(),
});

const body = z.object({
    source: z.enum(["cli", "extension", "web", "mcp"]),
    version: text(40).optional(),
    events: z.array(event).min(1).max(20),
});

const loggers = new Map<Source, ReturnType<typeof getLogger>>();
const loggerFor = (source: Source) => {
    if (!loggers.has(source)) loggers.set(source, getLogger("telemetry", source));
    return loggers.get(source)!;
};

// POST /api/telemetry — client-side errors, command timings and web vitals, forwarded to the
// log pipeline with a `source` label. Anonymous submissions are allowed (sendBeacon can't send
// headers); a Bearer token, when present, attributes events to the user. No habit data.
export const POST = withRoute(
    {
        name: "POST /api/telemetry",
        auth: "optional",
        body,
        rateLimit: ({ req, user }) => [
            rateLimits.ip(req, "telemetry", rateLimits.perMinute(60)),
            user ? rateLimits.user(user.userId, "telemetry", rateLimits.perMinute(120)) : null,
        ],
    },
    async ({ body, user, req }) => {
        const log = loggerFor(body.source);
        const ua = req.headers.get("user-agent")?.slice(0, 120);
        for (const e of body.events) {
            const fields = { ...e, version: body.version, userId: user?.userId, ua: body.source === "web" ? ua : undefined };
            if (e.type === "error") log.warn("client error", fields);
            else if (e.ok === false) log.warn(`client ${e.type} failed`, fields);
            else log.info(`client ${e.type}`, fields);
        }
        return new Response(null, { status: 202 });
    },
);
