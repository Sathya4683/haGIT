import type { NavItem } from "@/components/admin/AdminShell";

export const ADMIN_NAV: NavItem[] = [
    { href: "", label: "Overview", icon: "overview", permission: "admin:access" },
    { href: "/users", label: "Users", icon: "users", permission: "ops:view" },
    { href: "/audit", label: "Audit log", icon: "audit", permission: "audit:view" },
];
