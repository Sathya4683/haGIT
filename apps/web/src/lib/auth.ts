import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const DEV_SECRET = "dev-secret-change-in-production";

/** Resolved lazily so `next build` can import route modules without runtime secrets. */
function secret(): string {
    const value = process.env.JWT_SECRET;
    if (value) return value;
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be set in production");
    }
    return DEV_SECRET;
}

export interface JwtPayload {
    userId: number;
    email: string;
    /** Token version; tokens are revoked by bumping User.tokenVersion. Absent on legacy tokens (= 0). */
    tv?: number;
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, secret(), { expiresIn: "90d" });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, secret()) as JwtPayload;
}

/** Normalises an email address for storage and lookup. */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/** Extract and verify the Bearer token signature. Throws "UNAUTHORIZED" on failure. */
export function requireAuth(req: NextRequest): JwtPayload {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
        throw new Error("UNAUTHORIZED");
    }
    const token = auth.slice(7);
    try {
        return verifyToken(token);
    } catch {
        throw new Error("UNAUTHORIZED");
    }
}

/** Typed 401 helper */
export function unauthorized() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message: string) {
    return Response.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
    return Response.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
    return Response.json({ error: message }, { status: 500 });
}
