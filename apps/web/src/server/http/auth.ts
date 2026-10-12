import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { unauthorizedError } from "./errors";

export interface AuthUser {
    userId: number;
    email: string;
}

/**
 * Verifies the Bearer token and checks it against the database: the user must still exist and
 * the token's version must match, so deleting an account or rotating tokens revokes access.
 */
export async function authenticateUser(req: NextRequest): Promise<AuthUser> {
    let payload;
    try {
        payload = requireAuth(req);
    } catch {
        throw unauthorizedError();
    }
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, tokenVersion: true },
    });
    if (!user || (payload.tv ?? 0) !== user.tokenVersion) throw unauthorizedError();
    return { userId: user.id, email: user.email };
}
