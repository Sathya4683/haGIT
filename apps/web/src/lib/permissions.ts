// Role-based access control. Edge-safe (no database access): used by middleware for coarse
// routing decisions and by server code, which always re-reads the role from the database.

export type Role = "USER" | "EDITOR" | "ADMIN";

export type Permission =
    /** Open the admin console at all. */
    | "admin:access"
    /** Create, edit, publish and delete knowledge-base articles. */
    | "kb:write"
    /** Change other users' roles. */
    | "users:manage"
    /** View users, jobs and system status; trigger jobs. */
    | "ops:view"
    | "audit:view";

export const ROLES: readonly Role[] = ["USER", "EDITOR", "ADMIN"];

const GRANTS: Record<Role, readonly Permission[]> = {
    USER: [],
    EDITOR: ["admin:access", "kb:write"],
    ADMIN: ["admin:access", "kb:write", "users:manage", "ops:view", "audit:view"],
};

export function isRole(value: unknown): value is Role {
    return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
    return role ? GRANTS[role].includes(permission) : false;
}

/** Whether `host` is the dedicated admin hostname (ADMIN_HOST). */
export function isAdminHost(host: string | null | undefined): boolean {
    const adminHost = process.env.ADMIN_HOST?.trim().toLowerCase();
    return Boolean(adminHost && host && host.toLowerCase() === adminHost);
}
