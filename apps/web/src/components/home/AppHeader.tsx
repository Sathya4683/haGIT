"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { BookOpen, LayoutGrid, Moon, Plus, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";

const NAV = [
    { href: "/dashboard", label: "Today", icon: LayoutGrid },
    { href: "/kb", label: "Library", icon: BookOpen },
];

export function AppHeader({ onNewHabit, onHome }: { onNewHabit?: () => void; onHome?: () => void }) {
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();
    const user = useAuthStore((s) => s.user);
    const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";
    const signedIn = mounted && Boolean(user);
    const nav = NAV.filter((item) => signedIn || item.href !== "/dashboard");
    const newHabit = "btn-press-sm flex items-center gap-1.5 h-9 text-xs font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal-sm";

    return (
        <header className="sticky top-0 z-30 bg-[rgb(var(--paper))]/90 backdrop-blur border-b-2 border-[rgb(var(--border))]">
            <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center gap-4">
                <Link href={signedIn ? "/dashboard" : "/"} onClick={onHome} className="flex items-center gap-2 group" aria-label="haGIT home">
                    <span className="w-8 h-8 border-2 border-[rgb(var(--border))] bg-brand-500 flex items-center justify-center shadow-brutal-sm dark:shadow-brutal-sm-dark group-hover:-translate-y-0.5 transition-transform">
                        <span className="text-white font-black text-[11px] font-mono">hG</span>
                    </span>
                    <span className="font-black tracking-tight hidden sm:inline">haGIT</span>
                </Link>

                <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Main">
                    {nav.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={href === "/dashboard" ? onHome : undefined}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 transition-colors",
                                    active ? "border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]" : "border-transparent text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]",
                                )}
                            >
                                <Icon size={14} strokeWidth={2.5} /> {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    {signedIn && (onNewHabit ? (
                        <>
                            <button onClick={onNewHabit} className={`${newHabit} hidden sm:flex px-3`}>
                                <Plus size={13} strokeWidth={3} /> New habit
                            </button>
                            <button onClick={onNewHabit} aria-label="New habit" className={`${newHabit} sm:hidden w-9 justify-center`}>
                                <Plus size={16} strokeWidth={3} />
                            </button>
                        </>
                    ) : (
                        <Link href="/dashboard?new=1" className={`${newHabit} px-3`} aria-label="New habit">
                            <Plus size={13} strokeWidth={3} /> <span className="hidden sm:inline">New habit</span>
                        </Link>
                    ))}
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        className="w-9 h-9 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    {signedIn ? (
                        <button onClick={() => setSettingsOpen(true)} aria-label="Settings" className="hover:-translate-y-0.5 transition-transform">
                            <Avatar email={user?.email} className="w-9 h-9" />
                        </button>
                    ) : mounted ? (
                        <>
                            <Link href="/auth/login" className="hidden sm:flex items-center h-9 px-3 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]">Sign in</Link>
                            <Link href="/auth/signup" className="btn-press-sm flex items-center h-9 px-3 text-xs font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal-sm">Get started</Link>
                        </>
                    ) : (
                        <span className="w-9 h-9" aria-hidden />
                    )}
                </div>
            </div>
        </header>
    );
}
