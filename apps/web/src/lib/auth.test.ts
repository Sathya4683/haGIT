// src/lib/auth.test.ts

import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  signToken,
  verifyToken,
  requireAuth,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "./auth";

describe("JWT utilities", () => {
  it("should sign and verify a token", () => {
    const payload = {
      userId: 1,
      email: "test@example.com",
    };

    const token = signToken(payload);
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it("should throw for an invalid token", () => {
    expect(() => verifyToken("invalid-token")).toThrow();
  });
});

describe("requireAuth", () => {
  it("should return payload for a valid bearer token", () => {
    const token = signToken({
      userId: 123,
      email: "user@example.com",
    });

    const req = new NextRequest("http://localhost/api/test", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const payload = requireAuth(req);

    expect(payload).toMatchObject({
      userId: 123,
      email: "user@example.com",
    });
  });

  it("should throw when authorization header is missing", () => {
    const req = new NextRequest("http://localhost/api/test");

    expect(() => requireAuth(req)).toThrow("UNAUTHORIZED");
  });

  it("should throw when authorization header is not bearer", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: {
        authorization: "Basic abc123",
      },
    });

    expect(() => requireAuth(req)).toThrow("UNAUTHORIZED");
  });

  it("should throw when bearer token is invalid", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: {
        authorization: "Bearer invalid-token",
      },
    });

    expect(() => requireAuth(req)).toThrow("UNAUTHORIZED");
  });
});

describe("response helpers", () => {
  it("should return 401 response", async () => {
    const res = unauthorized();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Unauthorized",
    });
  });

  it("should return 400 response", async () => {
    const res = badRequest("Invalid input");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid input",
    });
  });

  it("should return 404 response", async () => {
    const res = notFound();

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "Not found",
    });
  });

  it("should return custom 404 response", async () => {
    const res = notFound("Habit not found");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "Habit not found",
    });
  });

  it("should return 500 response", async () => {
    const res = serverError();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Internal server error",
    });
  });

  it("should return custom 500 response", async () => {
    const res = serverError("Database unavailable");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Database unavailable",
    });
  });
});
