import { beforeEach, describe, expect, it, vi } from "vitest";

const { evalMock, connectMock, createClientMock } = vi.hoisted(() => {
    const evalMock = vi.fn();
    const connectMock = vi.fn(async () => undefined);
    const client = { isReady: true, connect: connectMock, eval: evalMock, on: vi.fn() };
    return { evalMock, connectMock, createClientMock: vi.fn(() => client) };
});

vi.mock("redis", () => ({ createClient: createClientMock }));
vi.mock("@upstash/redis", () => ({ Redis: class { eval = evalMock; } }));

import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit Redis behavior", () => {
    beforeEach(() => {
        process.env.REDIS_PROVIDER = "local";
        evalMock.mockReset();
        createClientMock.mockClear();
    });

    it("passes through the atomic token bucket decision", async () => {
        evalMock.mockResolvedValue([1, 19, 0]);
        await expect(checkRateLimit("user:42:commits", { capacity: 20, refillPerSecond: 20 / 60 }))
            .resolves.toEqual({ allowed: true, remaining: 19, retryAfter: 0 });
        expect(evalMock).toHaveBeenCalledWith(expect.stringContaining("redis.call('TIME')"), expect.anything());
    });

    it("returns the retry duration when the Redis bucket is exhausted", async () => {
        evalMock.mockResolvedValue([0, 0, 4]);
        await expect(checkRateLimit("user:42:commits", { capacity: 20, refillPerSecond: 20 / 60 }))
            .resolves.toEqual({ allowed: false, remaining: 0, retryAfter: 4 });
    });

    it("fails open when Redis is unavailable", async () => {
        evalMock.mockRejectedValue(new Error("connection refused"));
        await expect(checkRateLimit("user:42:commits", { capacity: 20, refillPerSecond: 20 / 60 }))
            .resolves.toEqual({ allowed: true, remaining: 20, retryAfter: 0 });
    });

    it("fails open when a Redis check stalls", async () => {
        evalMock.mockImplementation(() => new Promise(() => undefined));
        await expect(checkRateLimit("user:42:commits", { capacity: 20, refillPerSecond: 20 / 60 }))
            .resolves.toEqual({ allowed: true, remaining: 20, retryAfter: 0 });
    }, 2_000);
});
