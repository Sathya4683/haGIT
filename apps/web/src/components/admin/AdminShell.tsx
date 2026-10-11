"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BookOpen, FlaskConical, Gauge, History, LogOut, Menu, Server, Users, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Permission, Role } from "@/lib/permissions";

export interface NavItem {
    href: string;
    label: string;
    icon: "overview" | "kb" | "playground" | "users" | "ops" | "audit";
    permission: Permission;
}

const ICONS = { overview: Gauge, kb: BookOpen, playground: FlaskConical, users: Users, ops: Server, audit: History };

interface Props {
    base: "" | "/admin";
    email: string;
    role: Role;
    nav: NavItem[];
    children: React.ReactNode;
}

export function AdminShell({ base, email, role, nav, children }: Props) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isActive = (href: string) => {
        const full = `${base}${href}` || "/";
        return href === "" ? pathname === (base || "/") : pathname === full || pathname.startsWith(`${full}/`);
    };

    const navList = (
        <nav className="flex flex-col gap-1">
            {nav.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                    <Link
                        key={item.href}
                        href={`${base}${item.href}` || "/"}
                        onClick={() => setOpen(false)}
                        className={cn(
                            "flex items-center gap-2.5 px-3 py-2 text-sm font-bold border-2 transition-colors",
                            isActive(item.href)
                                ? "bg-ink dark:bg-white text-white dark:text-ink border-ink dark:border-white"
                                : "border-transparent text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] hover:border-[rgb(var(--border))]",
                        )}
                    >
                        <Icon size={14} strokeWidth={2.5} />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <div className="min-h-screen bg-[rgb(var(--paper))] lg:flex">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-60 flex flex-col border-r-2 border-[rgb(var(--border))] bg-[rgb(var(--paper))] transition-transform lg:static lg:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex items-center justify-between h-14 px-4 border-b-2 border-[rgb(var(--border))]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 border-2 border-[rgb(var(--border))] flex items-center justify-center bg-brand-500">
                            <span className="text-white font-black text-[10px] font-mono">hG</span>
                        </div>
                        <span className="font-black text-sm tracking-tight">haGIT</span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 border-2 border-[rgb(var(--border))]">
                            Admin
                        </span>
                    </div>
                    <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">{navList}</div>
                <div className="border-t-2 border-[rgb(var(--border))] p-3 space-y-2">
                    <div className="px-1">
                        <p className="text-xs font-mono font-medium truncate" title={email}>{email}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">{role}</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: `${base}/login` })}
                        className="btn-press-sm w-full flex items-center justify-center gap-2 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                    >
                        <LogOut size={12} /> Sign out
                    </button>
                </div>
            </aside>
            {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

            {/* Content */}
            <div className="flex-1 min-w-0">
                <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-12 px-4 border-b-2 border-[rgb(var(--border))] bg-[rgb(var(--paper))]">
                    <button onClick={() => setOpen(true)} aria-label="Open menu">
                        <Menu size={18} />
                    </button>
                    <span className="font-black text-sm">haGIT Admin</span>
                </header>
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8">{children}</main>
            </div>
        </div>
    );
}
