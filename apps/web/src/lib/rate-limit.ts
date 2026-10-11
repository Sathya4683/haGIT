import { createHash } from "node:crypto";
import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient, type RedisClientType } from "redis";
import type { NextRequest } from "next/server";

export type BucketOptions = { capacity: number; refillPerSecond: number };
export type BucketResult = { allowed: boolean; remaining: number; retryAfter: number };

/**
 * A named limit. `failClosed` policies (auth endpoints) fall back to an in-process bucket when
 * Redis is unavailable instead of allowing every request.
 */
export type RateLimitPolicy = { key: string; options: BucketOptions; failClosed?: boolean };

// Token bucket, evaluated atomically in Redis using the server clock.
const TOKEN_BUCKET_SCRIPT = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local state = redis.call('HMGET', KEYS[1], 'tokens', 'updatedAt')
local capacity = tonumber(ARGV[1])
local refillPerMs = tonumber(ARGV[2]) / 1000
local tokens = tonumber(state[1]) or capacity
local updatedAt = tonumber(state[2]) or now
tokens = math.min(capacity, tokens + math.max(0, now - updatedAt) * refillPerMs)
local allowed = 0
local retryAfter = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  retryAfter = math.ceil((1 - tokens) / refillPerMs / 1000)
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'updatedAt', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / refillPerMs * 2))
return { allowed, math.floor(tokens), retryAfter }
`;

let localRedis: RedisClientType | undefined;
let localRedisConnecting: Promise<RedisClientType> | undefined;
let upstashScript: { exec: (keys: string[], args: string[]) => Promise<unknown> } | undefined;
let lastRedisWarningAt = 0;

const REDIS_CHECK_TIMEOUT_MS = 750;
const REDIS_CONNECT_TIMEOUT_MS = 500;

/**
 * Explicit REDIS_PROVIDER wins. Otherwise Upstash is used whenever its credentials exist, so a
 * missing variable on Vercel never makes requests wait on a localhost connection attempt.
 */
export function redisProvider(): "upstash" | "local" {
    const explicit = process.env.REDIS_PROVIDER;
    if (explicit === "upstash" || explicit === "local") return explicit;
    if (explicit) throw new Error(`Unsupported REDIS_PROVIDER: ${explicit}`);
    return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? "upstash" : "local";
}

async function getLocalRedis() {
    if (localRedis?.isReady) return localRedis;
    if (!localRedisConnecting) {
        const client = createClient({
            url: process.env.REDIS_URL || "redis://localhost:6381",
            disableOfflineQueue: true,
            socket: {
                connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
                reconnectStrategy: false,
            },
        });
        // The request path reports a throttled warning when a check fails. Keep this
        // listener to prevent EventEmitter's unhandled-error behavior, without logging
        // every socket retry/error from the Redis client.
        client.on("error", () => {});
        localRedisConnecting = client.connect().then(() => {
            localRedis = client;
            return client;
        }).finally(() => { localRedisConnecting = undefined; });
    }
    return localRedisConnecting;
}

function getUpstashScript() {
    if (!upstashScript) {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url || !token) throw new Error("Upstash Redis environment variables are missing");
        // createScript uses EVALSHA and falls back to EVAL once if the script is not cached.
        upstashScript = new UpstashRedis({ url, token }).createScript<number[]>(TOKEN_BUCKET_SCRIPT);
    }
    return upstashScript;
}

async function consume(key: string, options: BucketOptions): Promise<BucketResult> {
    const args = [String(options.capacity), String(options.refillPerSecond)];
    let result: number[];

    if (redisProvider() === "upstash") {
        result = (await getUpstashScript().exec([key], args)) as number[];
    } else {
        const redis = await getLocalRedis();
        result = await redis.eval(TOKEN_BUCKET_SCRIPT, { keys: [key], arguments: args }) as number[];
    }

    return { allowed: result[0] === 1, remaining: result[1], retryAfter: result[2] };
}

// ── In-process fallback for fail-closed policies ────────────────────────────

const memoryBuckets = new Map<string, { tokens: number; updatedAt: number }>();
const MEMORY_BUCKET_LIMIT = 10_000;

export function consumeMemory(key: string, options: BucketOptions, now = Date.now()): BucketResult {
    const refillPerMs = options.refillPerSecond / 1000;
    const state = memoryBuckets.get(key) ?? { tokens: options.capacity, updatedAt: now };
    const tokens = Math.min(options.capacity, state.tokens + Math.max(0, now - state.updatedAt) * refillPerMs);

    if (memoryBuckets.size >= MEMORY_BUCKET_LIMIT && !memoryBuckets.has(key)) {
        const oldest = memoryBuckets.keys().next().value;
        if (oldest !== undefined) memoryBuckets.delete(oldest);
    }

    if (tokens >= 1) {
        memoryBuckets.set(key, { tokens: tokens - 1, updatedAt: now });
        return { allowed: true, remaining: Math.floor(tokens - 1), retryAfter: 0 };
    }
    memoryBuckets.set(key, { tokens, updatedAt: now });
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((1 - tokens) / refillPerMs / 1000) };
}

export async function checkRateLimit(
    key: string,
    options: BucketOptions,
    { failClosed = false }: { failClosed?: boolean } = {},
): Promise<BucketResult> {
    const fullKey = `hagit:rate-limit:${key}`;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            consume(fullKey, options),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error("Redis rate-limit check timed out")), REDIS_CHECK_TIMEOUT_MS);
            }),
        ]);
    } catch {
        // Never include key/IP data in logs.
        const now = Date.now();
        if (now - lastRedisWarningAt >= 60_000) {
            lastRedisWarningAt = now;
            console.error(`[rate-limit] Redis check failed; ${failClosed ? "using in-process limit" : "allowing request"}`);
        }
        if (failClosed) return consumeMemory(fullKey, options, now);
        return { allowed: true, remaining: options.capacity, retryAfter: 0 };
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

export function checkPolicy(policy: RateLimitPolicy) {
    return checkRateLimit(policy.key, policy.options, { failClosed: policy.failClosed });
}

export function clientIp(req: NextRequest | Request) {
    // Vercel sets x-real-ip to the connecting client and overwrites x-forwarded-for.
    return (
        req.headers.get("x-real-ip")?.trim() ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
    );
}

export function hashKey(value: string) {
    return createHash("sha256").update(value).digest("hex");
}

export function clientIpKey(req: NextRequest | Request) {
    return hashKey(clientIp(req));
}

type UserOperation = "habits" | "commits" | "coach";

export async function limitUserOperation(userId: number, operation: UserOperation) {
    return checkRateLimit(`user:${userId}:${operation}`, userOperationLimitConfig(operation));
}

export function userOperationLimitConfig(operation: UserOperation): BucketOptions {
    // One coach run is several Gemini calls against a free-tier quota shared by every user.
    if (operation === "coach") return { capacity: 5, refillPerSecond: 5 / 3600 };
    return { capacity: 20, refillPerSecond: 20 / 60 };
}

export function authLimitConfig(operation: "signup" | "login"): BucketOptions {
    const capacity = operation === "signup" ? 5 : 10;
    return { capacity, refillPerSecond: capacity / (15 * 60) };
}

export async function limitAuthIp(req: NextRequest, operation: "signup" | "login") {
    return checkRateLimit(`ip:${clientIpKey(req)}:${operation}`, authLimitConfig(operation), { failClosed: true });
}

const perMinute = (capacity: number): BucketOptions => ({ capacity, refillPerSecond: capacity / 60 });
const perHour = (capacity: number): BucketOptions => ({ capacity, refillPerSecond: capacity / 3600 });

/** Named policies shared by the route handlers. */
export const rateLimits = {
    userWrite: (userId: number, operation: "habits" | "commits"): RateLimitPolicy => ({
        key: `user:${userId}:${operation}`,
        options: userOperationLimitConfig(operation),
    }),
    /** Generous ceiling on reads so a looping client cannot hammer the database. */
    userRead: (userId: number): RateLimitPolicy => ({ key: `user:${userId}:read`, options: perMinute(120) }),
    coach: (userId: number): RateLimitPolicy => ({ key: `user:${userId}:coach`, options: userOperationLimitConfig("coach") }),
    /** Shared Gemini quota: bursts of runs across all users. */
    coachGlobal: (): RateLimitPolicy => ({ key: "global:coach", options: { capacity: 6, refillPerSecond: 3 / 60 } }),
    authIp: (req: NextRequest, operation: "signup" | "login"): RateLimitPolicy => ({
        key: `ip:${clientIpKey(req)}:${operation}`,
        options: authLimitConfig(operation),
        failClosed: true,
    }),
    /** Per-account login attempts, independent of the caller's IP. */
    loginEmail: (email: string): RateLimitPolicy => ({
        key: `email:${hashKey(email)}:login`,
        options: authLimitConfig("login"),
        failClosed: true,
    }),
    ip: (req: NextRequest | Request, name: string, options: BucketOptions): RateLimitPolicy => ({
        key: `ip:${clientIpKey(req)}:${name}`,
        options,
    }),
    user: (userId: number, name: string, options: BucketOptions): RateLimitPolicy => ({
        key: `user:${userId}:${name}`,
        options,
    }),
    perMinute,
    perHour,
};

export function rateLimitExceeded(retryAfter: number) {
    const seconds = Math.max(1, retryAfter);
    return Response.json(
        { error: "Too many requests. Please try again later.", retryAfter: seconds },
        { status: 429, headers: { "Retry-After": String(seconds), "RateLimit-Remaining": "0" } },
    );
}
