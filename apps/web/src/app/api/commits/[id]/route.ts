export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { requireAuth, unauthorized, notFound, serverError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/commits/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return notFound();

    const commit = await prisma.commit.findFirst({ where: { id, userId: payload.userId } });
    if (!commit) return notFound("Commit not found.");

    await prisma.commit.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === "UNAUTHORIZED") return unauthorized();
    console.error("[DELETE /api/commits/:id]", e);
    return serverError();
  }
}
