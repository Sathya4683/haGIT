import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
    authLimitConfig,
    clientIpKey,
    consumeMemory,
    rateLimitExceeded,
    redisProvider,
    userOperationLimitConfig,
} from "./rate-limit";

describe("rate-limit policy", () => {
    it("shares a 20 per minute policy across habit and commit operations", () => {
        expect(userOperationLimitConfig("habits")).toEqual({ capacity: 20, refillPerSecond: 20 / 60 });
        expect(userOperationLimitConfig("commits")).toEqual({ capacity: 20, refillPerSecond: 20 / 60 });
    });

    it("limits coach runs to 5 per hour", () => {
        expect(userOperationLimitConfig("coach")).toEqual({ capacity: 5, refillPerSecond: 5 / 3600 });
    });

    it("sets independent signup and login attempt limits", () => {
        expect(authLimitConfig("signup")).toEqual({ capacity: 5, refillPerSecond: 5 / 900 });
        expect(authLimitConfig("login")).toEqual({ capacity: 10, refillPerSecond: 10 / 900 });
    });

    it("hashes the first forwarded client address for IP keys", () => {
        const first = new NextRequest("http://localhost", {
            headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.2" },
        });
        const sameAddress = new NextRequest("http://localhost", {
            headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.3" },
        });
        const otherAddress = new NextRequest("http://localhost", {
            headers: { "x-real-ip": "203.0.113.9" },
        });

        expect(clientIpKey(first)).toBe(clientIpKey(sameAddress));
        expect(clientIpKey(first)).not.toBe(clientIpKey(otherAddress));
        expect(clientIpKey(first)).not.toContain("203.0.113.8");
    });

    it("returns a 429 response with retry metadata", async () => {
        const response = rateLimitExceeded(12);
        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("12");
        expect(await response.json()).toEqual({
            error: "Too many requests. Please try again later.",
            retryAfter: 12,
        });
    });

    it("prefers Upstash when its credentials exist and no provider is set", () => {
        const saved = { ...process.env };
        delete process.env.REDIS_PROVIDER;
        process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
        process.env.UPSTASH_REDIS_REST_TOKEN = "t";
        expect(redisProvider()).toBe("upstash");
        process.env.REDIS_PROVIDER = "local";
        expect(redisProvider()).toBe("local");
        process.env = saved;
    });

    it("enforces the in-process fallback bucket", () => {
        const options = { capacity: 2, refillPerSecond: 1 };
        const t = 1_000_000;
        expect(consumeMemory("fallback-test", options, t).allowed).toBe(true);
        expect(consumeMemory("fallback-test", options, t).allowed).toBe(true);
        const denied = consumeMemory("fallback-test", options, t);
        expect(denied).toEqual({ allowed: false, remaining: 0, retryAfter: 1 });
        expect(consumeMemory("fallback-test", options, t + 1000).allowed).toBe(true);
    });
});
