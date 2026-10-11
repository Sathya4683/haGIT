"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export function PublicHeader() {
    const { resolvedTheme, setTheme } = useTheme();
    const user = useAuthStore((s) => s.user);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    return (
        <header className="sticky top-0 z-30 bg-[rgb(var(--paper))] border-b-2 border-[rgb(var(--border))]">
            <div className="max-w-5xl mx-auto flex items-center justify-between h-12 px-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-7 h-7 border-2 border-[rgb(var(--border))] flex items-center justify-center bg-brand-500">
                            <span className="text-white font-black text-[10px] font-mono">hG</span>
                        </div>
                        <span className="font-black text-sm tracking-tight">haGIT</span>
                    </Link>
                    <span className="text-[rgb(var(--ink-muted))]">/</span>
                    <Link href="/kb" className="text-sm font-bold hover:text-brand-600 dark:hover:text-brand-400">
                        Library
                    </Link>
                </div>
                <div className="flex items-center gap-1.5">
                    <Link
                        href={mounted && user ? "/dashboard" : "/auth/login"}
                        className="btn-press-sm px-3 py-1.5 text-xs font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal-sm"
                    >
                        {mounted && user ? "Dashboard" : "Sign in"}
                    </Link>
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        className="w-8 h-8 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun size={13} /> : <Moon size={13} />}
                    </button>
                </div>
            </div>
        </header>
    );
}
