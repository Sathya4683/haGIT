import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { authLimitConfig, clientIpKey, rateLimitExceeded, userOperationLimitConfig } from "./rate-limit";

describe("rate-limit policy", () => {
    it("shares a 20 per minute policy across habit and commit operations", () => {
        expect(userOperationLimitConfig("habits")).toEqual({ capacity: 20, refillPerSecond: 20 / 60 });
        expect(userOperationLimitConfig("commits")).toEqual({ capacity: 20, refillPerSecond: 20 / 60 });
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
});
