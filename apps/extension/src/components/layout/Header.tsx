"use client";

import { GitCommitHorizontal, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Habit } from "@hagit/types";
import type { View } from "@/types";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
    habits: Habit[];
    selectedHabit: Habit | null;
    onSelectHabit: (h: Habit) => void;
    activeView: View;
    onChangeView: (v: View) => void;
    email?: string;
}

const TABS: { id: View; label: string }[] = [
    { id: "commit", label: "Commit" },
    { id: "habits", label: "Habits" },
    { id: "recent", label: "Recent" },
    { id: "settings", label: "Settings" },
];

export function Header({ habits, selectedHabit, onSelectHabit, activeView, onChangeView, email }: HeaderProps) {
    const [habitOpen, setHabitOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setHabitOpen(false);
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    return (
        <header className="flex-shrink-0 bg-[rgb(var(--paper))] border-b-2 border-[rgb(var(--border))]">
            {/* Top row — brand + habit selector */}
            <div className="flex items-center justify-between px-3 h-11 border-b-2 border-[rgb(var(--border))]">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-500 border-2 border-[rgb(var(--border))] flex items-center justify-center flex-shrink-0">
                        <GitCommitHorizontal size={12} strokeWidth={3} className="text-white" />
                    </div>
                    <span className="font-black text-sm tracking-tight">haGIT</span>
                    {email && (
                        <>
                            <span className="text-[rgb(var(--ink-muted))] text-xs">·</span>
                            <span className="text-[10px] font-mono text-[rgb(var(--ink-muted))] max-w-[100px] truncate">{email}</span>
                        </>
                    )}
                </div>

                {/* Habit picker */}
                {habits.length > 0 && (
                    <div ref={dropdownRef} className="relative flex-shrink-0">
                        <button
                            onClick={() => setHabitOpen(!habitOpen)}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 border-2 border-[rgb(var(--border))] text-xs font-bold",
                                "hover:bg-[rgb(var(--paper-alt))] transition-colors max-w-[130px]",
                                habitOpen && "bg-[rgb(var(--paper-alt))]"
                            )}
                        >
                            <span className="truncate">{selectedHabit?.name ?? "Select habit"}</span>
                            <ChevronDown size={10} strokeWidth={3} className={cn("flex-shrink-0 transition-transform", habitOpen && "rotate-180")} />
                        </button>

                        {habitOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] shadow-brutal z-50 min-w-[160px] max-h-40 overflow-y-auto scrollbar-thin animate-fade-in">
                                {habits.map((h) => (
                                    <button
                                        key={h.id}
                                        onClick={() => { onSelectHabit(h); setHabitOpen(false); }}
                                        className={cn(
                                            "w-full text-left flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold hover:bg-[rgb(var(--paper-alt))] transition-colors border-b border-[rgb(var(--paper-alt))] last:border-0",
                                            selectedHabit?.id === h.id && "text-brand-700"
                                        )}
                                    >
                                        <span className="truncate">{h.name}</span>
                                        <span className="font-mono text-[10px] text-[rgb(var(--ink-muted))] flex-shrink-0">{h.commitCount}</span>
                                        {selectedHabit?.id === h.id && <Check size={10} className="text-brand-500 flex-shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tab bar */}
            <div className="flex">
                {TABS.map((tab, i) => (
                    <button
                        key={tab.id}
                        onClick={() => onChangeView(tab.id)}
                        className={cn(
                            "flex-1 py-2 text-[11px] font-black uppercase tracking-wider transition-colors border-r-2 border-[rgb(var(--border))] last:border-r-0",
                            activeView === tab.id
                                ? "bg-[rgb(var(--border))] text-[rgb(var(--paper))]"
                                : "hover:bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))]"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </header>
    );
}
