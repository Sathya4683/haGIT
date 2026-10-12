"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, FlaskConical, Gauge, History, LineChart, LogOut, Menu, Server, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/components/ui/Avatar";
import type { Permission, Role } from "@/lib/permissions";

export interface NavItem {
    href: string;
    label: string;
    icon: "overview" | "kb" | "playground" | "users" | "ops" | "audit";
    permission: Permission;
    group?: "Content" | "People" | "System";
}

const ICONS = { overview: Gauge, kb: BookOpen, playground: FlaskConical, users: Users, ops: Server, audit: History };
const GROUPS = ["Content", "People", "System"] as const;

interface Props {
    base: "" | "/admin";
    email: string;
    role: Role;
    nav: NavItem[];
    grafanaUrl?: string;
    appUrl?: string;
    children: React.ReactNode;
}

export function AdminShell({ base, email, role, nav, grafanaUrl, appUrl, children }: Props) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    useEffect(() => setOpen(false), [pathname]);

    // The most specific matching item is active (e.g. /kb/playground, not /kb as well).
    const matches = (href: string) => {
        const full = `${base}${href}` || "/";
        return href === "" ? pathname === (base || "/") : pathname === full || pathname.startsWith(`${full}/`);
    };
    const activeHref = nav.filter((item) => matches(item.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

    const link = (item: NavItem) => {
        const Icon = ICONS[item.icon];
        const active = item.href === activeHref;
        return (
            <Link
                key={item.href}
                href={`${base}${item.href}` || "/"}
                aria-current={active ? "page" : undefined}
                className={cn(
                    "group relative flex items-center gap-2.5 h-9 px-3 text-[13px] font-bold transition-colors",
                    active ? "bg-white/10 text-white" : "text-white/55 hover:text-white hover:bg-white/5",
                )}
            >
                {active && <span className="absolute left-0 inset-y-1.5 w-[3px] bg-brand-400" />}
                <Icon size={15} strokeWidth={active ? 2.5 : 2} className={active ? "text-brand-400" : ""} />
                {item.label}
            </Link>
        );
    };

    const external = "flex items-center gap-2.5 h-9 px-3 text-[13px] font-bold text-white/55 hover:text-white hover:bg-white/5";

    return (
        <div className="min-h-screen bg-[rgb(var(--paper))] lg:flex">
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[#111113] text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
                    <Link href={base || "/"} className="flex items-center gap-2.5">
                        <span className="w-8 h-8 flex items-center justify-center bg-brand-500 border-2 border-white/80 shadow-[2px_2px_0_rgba(255,255,255,0.25)]">
                            <span className="text-white font-black text-[11px] font-mono">hG</span>
                        </span>
                        <span className="leading-tight">
                            <span className="block font-black text-sm tracking-tight">haGIT</span>
                            <span className="block font-mono text-[10px] text-white/45">admin console</span>
                        </span>
                    </Link>
                    <button className="lg:hidden w-8 h-8 flex items-center justify-center hover:bg-white/10" onClick={() => setOpen(false)} aria-label="Close menu">
                        <X size={16} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Admin">
                    <div className="space-y-0.5">{nav.filter((i) => !i.group).map(link)}</div>
                    {GROUPS.map((group) => {
                        const items = nav.filter((i) => i.group === group);
                        if (items.length === 0 && !(group === "System" && grafanaUrl)) return null;
                        return (
                            <div key={group}>
                                <p className="px-3 mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">{group}</p>
                                <div className="space-y-0.5">
                                    {items.map(link)}
                                    {group === "System" && grafanaUrl && (
                                        <a href={grafanaUrl} target="_blank" rel="noreferrer" className={external}>
                                            <LineChart size={15} /> Grafana <ArrowUpRight size={12} className="ml-auto opacity-60" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {appUrl && (
                        <div className="pt-1 border-t border-white/10">
                            <a href={appUrl} target="_blank" rel="noreferrer" className={cn(external, "mt-3")}>
                                <ArrowUpRight size={15} /> Open the app
                            </a>
                        </div>
                    )}
                </nav>

                <div className="border-t border-white/10 p-3">
                    <div className="flex items-center gap-2.5 px-2 py-2">
                        <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-brand-500/20 text-brand-300 border border-brand-400/40 text-[11px] font-black font-mono">
                            {initialsOf(email)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate" title={email}>{email}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-400">{role}</p>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: `${base}/login` })}
                            className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
                            aria-label="Sign out" title="Sign out"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>
            {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden animate-fade-in" onClick={() => setOpen(false)} />}

            <div className="flex-1 min-w-0">
                <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-14 px-4 bg-[#111113] text-white">
                    <button onClick={() => setOpen(true)} aria-label="Open menu" className="w-9 h-9 flex items-center justify-center -ml-2 hover:bg-white/10">
                        <Menu size={18} />
                    </button>
                    <span className="w-6 h-6 flex items-center justify-center bg-brand-500 text-[9px] font-black font-mono">hG</span>
                    <span className="font-black text-sm">{nav.find((i) => i.href === activeHref)?.label ?? "Admin"}</span>
                </header>
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">{children}</main>
            </div>
        </div>
    );
}
