import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Records a privileged admin action. */
export async function audit(actorId: number, action: string, target?: string, meta?: Prisma.InputJsonValue) {
    await prisma.auditLog.create({ data: { actorId, action, target, meta } });
}
