import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can, isAdminHost, type Permission, type Role } from "@/lib/permissions";

export interface AdminActor {
    userId: number;
    email: string;
    name: string | null;
    role: Role;
}

/**
 * The signed-in admin-console user, with the role read from the database (never trusted from
 * the session token). Null when signed out, revoked, or not allowed into the console.
 */
export async function getAdminActor(): Promise<AdminActor | null> {
    const session = await auth();
    const userId = session?.user?.userId;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });
    if (!user || user.tokenVersion !== session.tokenVersion) return null;
    if (!can(user.role, "admin:access")) return null;
    return { userId: user.id, email: user.email, name: user.name, role: user.role };
}

export async function getAdminActorWith(permission: Permission): Promise<AdminActor | null> {
    const actor = await getAdminActor();
    return actor && can(actor.role, permission) ? actor : null;
}

/** "" on the dedicated admin host (pages live at /), "/admin" when served on the main host. */
export function adminBasePath(): "" | "/admin" {
    return isAdminHost(headers().get("host")) ? "" : "/admin";
}
