import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const { checkPolicy, authenticateUser } = vi.hoisted(() => ({
    checkPolicy: vi.fn(),
    authenticateUser: vi.fn(),
}));

vi.mock("@vercel/functions", () => ({ waitUntil: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkPolicy }));
vi.mock("./auth", () => ({ authenticateUser }));
vi.mock("@/server/admin/session", () => ({ getAdminActor: vi.fn() }));

import { withRoute } from "./withRoute";
import { HttpError, unauthorizedError } from "./errors";

const post = (body: unknown, headers: Record<string, string> = {}) =>
    new NextRequest("http://localhost/api/test", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
        headers: { "content-type": "application/json", ...headers },
    });

describe("withRoute", () => {
    beforeEach(() => {
        checkPolicy.mockReset().mockResolvedValue({ allowed: true, remaining: 7, retryAfter: 0 });
        authenticateUser.mockReset().mockResolvedValue({ userId: 1, email: "a@b.c" });
        vi.spyOn(console, "log").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    it("validates the body and returns the first issue message", async () => {
        const route = withRoute(
            { name: "POST /t", body: z.object({ name: z.string().min(1, "name is required.") }) },
            async () => Response.json({ ok: true }),
        );
        const res = await route(post({ name: "" }));
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "name is required." });
    });

    it("rejects invalid JSON", async () => {
        const route = withRoute({ name: "POST /t", body: z.object({}) }, async () => Response.json({}));
        const res = await route(post("{not json"));
        expect(res.status).toBe(400);
    });

    it("maps HttpError and unique violations", async () => {
        const failing = withRoute({ name: "POST /t" }, async () => {
            throw new HttpError(404, "Habit not found.");
        });
        expect((await failing(post({}))).status).toBe(404);

        const conflict = withRoute({ name: "POST /t", conflictMessage: "Exists." }, async () => {
            throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "5" });
        });
        const res = await conflict(post({}));
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({ error: "Exists." });
    });

    it("hides unexpected errors behind a 500", async () => {
        const route = withRoute({ name: "POST /t" }, async () => {
            throw new Error("db password leaked in message");
        });
        const res = await route(post({}));
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: "Internal server error" });
    });

    it("requires authentication when asked to", async () => {
        authenticateUser.mockRejectedValue(unauthorizedError());
        const route = withRoute({ name: "POST /t", auth: "user" }, async () => Response.json({}));
        expect((await route(post({}))).status).toBe(401);
    });

    it("returns 429 with Retry-After when a policy is exhausted", async () => {
        checkPolicy.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 12 });
        const handler = vi.fn(async () => Response.json({}));
        const route = withRoute(
            { name: "POST /t", auth: "user", rateLimit: ({ user }) => ({ key: `u:${user.userId}`, options: { capacity: 1, refillPerSecond: 1 } }) },
            handler,
        );
        const res = await route(post({}));
        expect(res.status).toBe(429);
        expect(res.headers.get("Retry-After")).toBe("12");
        expect(await res.json()).toEqual({ error: "Too many requests. Please try again later.", retryAfter: 12 });
        expect(handler).not.toHaveBeenCalled();
    });

    it("passes the user to the handler and sets tracing headers", async () => {
        const route = withRoute(
            { name: "POST /t", auth: "user", rateLimit: () => ({ key: "k", options: { capacity: 10, refillPerSecond: 1 } }) },
            async ({ user }) => Response.json({ id: user.userId }),
        );
        const res = await route(post({}, { "x-request-id": "req-123" }));
        expect(await res.json()).toEqual({ id: 1 });
        expect(res.headers.get("X-Request-Id")).toBe("req-123");
        expect(res.headers.get("RateLimit-Remaining")).toBe("7");
    });
});
