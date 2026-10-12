"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, LayoutGrid, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

/** Bottom tab bar on phones. */
export function MobileNav() {
    const pathname = usePathname();
    const { coachOpen, settingsOpen, setCoachOpen, setSettingsOpen } = useUiStore();
    const item = "relative flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-bold";
    const active = "text-[rgb(var(--ink))]";
    const idle = "text-[rgb(var(--ink-muted))]";
    const onToday = pathname === "/dashboard" && !coachOpen && !settingsOpen;
    const onLibrary = pathname.startsWith("/kb") && !coachOpen && !settingsOpen;

    return (
        <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[rgb(var(--paper))] border-t-2 border-[rgb(var(--border))] pb-safe"
            aria-label="Main"
        >
            <div className="flex">
                <Link href="/dashboard" onClick={() => { setCoachOpen(false); setSettingsOpen(false); }} className={cn(item, onToday ? active : idle)}>
                    <LayoutGrid size={19} strokeWidth={onToday ? 2.75 : 2} /> Today
                    {onToday && <span className="absolute top-0 h-[3px] w-10 bg-brand-500" />}
                </Link>
                <Link href="/kb" onClick={() => { setCoachOpen(false); setSettingsOpen(false); }} className={cn(item, onLibrary ? active : idle)}>
                    <BookOpen size={19} strokeWidth={onLibrary ? 2.75 : 2} /> Library
                    {onLibrary && <span className="absolute top-0 h-[3px] w-10 bg-brand-500" />}
                </Link>
                <button onClick={() => setCoachOpen(!coachOpen)} className={cn(item, "relative", coachOpen ? active : idle)}>
                    <Bot size={19} strokeWidth={coachOpen ? 2.75 : 2} /> Coach
                    {coachOpen && <span className="absolute top-0 h-[3px] w-10 bg-brand-500" />}
                </button>
                <button onClick={() => setSettingsOpen(!settingsOpen)} className={cn(item, "relative", settingsOpen ? active : idle)}>
                    <Settings size={19} strokeWidth={settingsOpen ? 2.75 : 2} /> Settings
                    {settingsOpen && <span className="absolute top-0 h-[3px] w-10 bg-brand-500" />}
                </button>
            </div>
        </nav>
    );
}
