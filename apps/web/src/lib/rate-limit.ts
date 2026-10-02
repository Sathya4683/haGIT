import { createHash } from "node:crypto";
import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient, type RedisClientType } from "redis";
import type { NextRequest } from "next/server";

type BucketOptions = { capacity: number; refillPerSecond: number };
type BucketResult = { allowed: boolean; remaining: number; retryAfter: number };

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
let upstashRedis: UpstashRedis | undefined;
let lastRedisWarningAt = 0;

const REDIS_CHECK_TIMEOUT_MS = 750;
const REDIS_CONNECT_TIMEOUT_MS = 500;

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

async function consume(key: string, options: BucketOptions): Promise<BucketResult> {
    const provider = process.env.REDIS_PROVIDER || "local";
    const args = [options.capacity, options.refillPerSecond];
    let result: number[];

    if (provider === "upstash") {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url || !token) throw new Error("Upstash Redis environment variables are missing");
        upstashRedis ??= new UpstashRedis({ url, token });
        result = await upstashRedis.eval<number[]>(TOKEN_BUCKET_SCRIPT, [key], args) as number[];
    } else if (provider === "local") {
        const redis = await getLocalRedis();
        result = await redis.eval(TOKEN_BUCKET_SCRIPT, { keys: [key], arguments: args.map(String) }) as number[];
    } else {
        throw new Error(`Unsupported REDIS_PROVIDER: ${provider}`);
    }

    return { allowed: result[0] === 1, remaining: result[1], retryAfter: result[2] };
}

export async function checkRateLimit(key: string, options: BucketOptions): Promise<BucketResult> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            consume(`hagit:rate-limit:${key}`, options),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error("Redis rate-limit check timed out")), REDIS_CHECK_TIMEOUT_MS);
            }),
        ]);
    } catch {
        // Availability is preferred during Redis outages; never include key/IP data in logs.
        const now = Date.now();
        if (now - lastRedisWarningAt >= 60_000) {
            lastRedisWarningAt = now;
            console.error("[rate-limit] Redis check failed; allowing request");
        }
        return { allowed: true, remaining: options.capacity, retryAfter: 0 };
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

export function clientIpKey(req: NextRequest) {
    // Use the address supplied by the hosting platform's trusted reverse proxy.
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
    return createHash("sha256").update(address).digest("hex");
}

export async function limitUserOperation(userId: number, operation: "habits" | "commits") {
    return checkRateLimit(`user:${userId}:${operation}`, userOperationLimitConfig(operation));
}

export function userOperationLimitConfig(_operation: "habits" | "commits"): BucketOptions {
    return { capacity: 20, refillPerSecond: 20 / 60 };
}

export function authLimitConfig(operation: "signup" | "login"): BucketOptions {
    const capacity = operation === "signup" ? 5 : 10;
    return { capacity, refillPerSecond: capacity / (15 * 60) };
}

export async function limitAuthIp(req: NextRequest, operation: "signup" | "login") {
    return checkRateLimit(`ip:${clientIpKey(req)}:${operation}`, authLimitConfig(operation));
}

export function rateLimitExceeded(retryAfter: number) {
    const seconds = Math.max(1, retryAfter);
    return Response.json(
        { error: "Too many requests. Please try again later.", retryAfter: seconds },
        { status: 429, headers: { "Retry-After": String(seconds) } },
    );
}
