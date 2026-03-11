import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export interface JwtPayload {
    userId: number;
    email: string;
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, SECRET, { expiresIn: "90d" });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, SECRET) as JwtPayload;
}

/** Extract and verify Bearer token from request. Throws on failure. */
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
