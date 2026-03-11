export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/account
export async function DELETE(req: NextRequest) {
    try {
        const payload = requireAuth(req);
        await prisma.user.delete({ where: { id: payload.userId } });
        return Response.json({ success: true });
    } catch (e: unknown) {
        if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
        console.error("[DELETE /api/account]", e);
        return serverError();
    }
}
