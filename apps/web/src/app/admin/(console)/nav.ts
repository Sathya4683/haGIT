import type { NavItem } from "@/components/admin/AdminShell";

export const ADMIN_NAV: NavItem[] = [
    { href: "", label: "Overview", icon: "overview", permission: "admin:access" },
    { href: "/kb", label: "Knowledge base", icon: "kb", permission: "kb:write" },
    { href: "/kb/playground", label: "Playground", icon: "playground", permission: "kb:write" },
    { href: "/users", label: "Users", icon: "users", permission: "ops:view" },
    { href: "/ops", label: "Jobs", icon: "ops", permission: "ops:view" },
    { href: "/audit", label: "Audit log", icon: "audit", permission: "audit:view" },
];
