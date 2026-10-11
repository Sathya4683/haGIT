// Shared wrapper for API route handlers: request id, authentication, input validation,
// rate limiting, error mapping and one structured log line per request.

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { ZodError, type ZodType } from "zod";
import { checkPolicy, type RateLimitPolicy } from "@/lib/rate-limit";
import { flushLogs, getLogger, type Logger } from "@/server/obs/logger";
import { authenticateUser, type AuthUser } from "./auth";
import { HttpError } from "./errors";

type AuthMode = "none" | "user" | "optional";
type UserFor<A extends AuthMode> = A extends "user" ? AuthUser : AuthUser | null;

export interface RouteContext<A extends AuthMode, B, Q, P> {
    req: NextRequest;
    params: P;
    user: UserFor<A>;
    body: B;
    query: Q;
    requestId: string;
    log: Logger;
}

type PolicyResult = RateLimitPolicy | null | undefined | (RateLimitPolicy | null | undefined)[];

export interface RouteOptions<A extends AuthMode, B, Q, P> {
    /** Stable route label used in logs and metrics, e.g. "POST /api/habits". */
    name: string;
    auth?: A;
    body?: ZodType<B>;
    query?: ZodType<Q>;
    /** Evaluated after authentication and validation, so malformed requests don't spend quota. */
    rateLimit?: (ctx: { req: NextRequest; user: UserFor<A>; body: B; query: Q; params: P }) => PolicyResult;
    /** Message for unique-constraint violations (Prisma P2002). */
    conflictMessage?: string;
}

const httpLog = getLogger("http");

async function readJson(req: NextRequest): Promise<unknown> {
    try {
        return await req.json();
    } catch {
        throw new HttpError(400, "Request body must be valid JSON.");
    }
}

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return Response.json(body, { status, headers });
}

function toResponse(e: unknown, conflictMessage: string | undefined, log: Logger): Response {
    if (e instanceof HttpError) return json(e.status, { error: e.message, ...e.extra }, e.headers);
    if (e instanceof ZodError) {
        const issue = e.issues[0];
        return json(400, { error: issue?.message ?? "Invalid request." });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") return json(409, { error: conflictMessage ?? "That already exists." });
        if (e.code === "P2025") return json(404, { error: "Not found" });
    }
    log.error("unhandled route error", { err: e });
    return json(500, { error: "Internal server error" });
}

function setHeader(res: Response, name: string, value: string) {
    try {
        res.headers.set(name, value);
    } catch {
        // Some responses (e.g. Response.redirect) have immutable headers.
    }
}

export function withRoute<
    A extends AuthMode = "none",
    B = undefined,
    Q = undefined,
    P = Record<string, string>,
>(opts: RouteOptions<A, B, Q, P>, handler: (ctx: RouteContext<A, B, Q, P>) => Promise<Response>) {
    return async function route(req: NextRequest, segment?: { params: P }): Promise<Response> {
        const started = performance.now();
        const requestId = req.headers.get("x-request-id") || randomUUID();
        const log = httpLog.child({ requestId, route: opts.name });
        let userId: number | undefined;
        let rateLimited = false;
        let response: Response;

        try {
            let user: AuthUser | null = null;
            if (opts.auth === "user") {
                user = await authenticateUser(req);
            } else if (opts.auth === "optional" && req.headers.has("authorization")) {
                user = await authenticateUser(req).catch(() => null);
            }
            userId = user?.userId;

            const params = (segment?.params ?? {}) as P;
            const query = (opts.query ? opts.query.parse(Object.fromEntries(req.nextUrl.searchParams)) : undefined) as Q;
            const body = (opts.body ? opts.body.parse(await readJson(req)) : undefined) as B;
            const typedUser = user as UserFor<A>;

            let remaining: number | undefined;
            if (opts.rateLimit) {
                const policies = [opts.rateLimit({ req, user: typedUser, body, query, params })]
                    .flat()
                    .filter((p): p is RateLimitPolicy => Boolean(p));
                for (const policy of policies) {
                    const result = await checkPolicy(policy);
                    if (!result.allowed) {
                        rateLimited = true;
                        const seconds = Math.max(1, result.retryAfter);
                        throw new HttpError(
                            429,
                            "Too many requests. Please try again later.",
                            { retryAfter: seconds },
                            { "Retry-After": String(seconds), "RateLimit-Remaining": "0" },
                        );
                    }
                    remaining = Math.min(remaining ?? Number.POSITIVE_INFINITY, result.remaining);
                }
            }

            response = await handler({ req, params, user: typedUser, body, query, requestId, log });
            if (remaining !== undefined) setHeader(response, "RateLimit-Remaining", String(remaining));
        } catch (e) {
            response = toResponse(e, opts.conflictMessage, log);
        }

        setHeader(response, "X-Request-Id", requestId);
        const fields = {
            method: req.method,
            status: response.status,
            durationMs: Math.round(performance.now() - started),
            userId,
            client: req.headers.get("x-hagit-client") ?? undefined,
            rateLimited: rateLimited || undefined,
        };
        if (response.status >= 500) log.error("request", fields);
        else log.info("request", fields);

        waitUntil(flushLogs());
        return response;
    };
}
