"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Settings, GitCommitHorizontal, Plus, X } from "lucide-react";
import type { Habit } from "@hagit/types";
import { cn } from "@/lib/utils";

interface TopNavProps {
    habits: Habit[];
    selectedHabitId: number | null;
    onSelectHabit: (id: number | null) => void;
    onCreateHabit: () => void;
    onDeleteHabit: (habit: Habit) => void;
    onPushCommit: () => void;
    onOpenSettings: () => void;
    loading?: boolean;
}

export function TopNav({
    habits, selectedHabitId, onSelectHabit,
    onCreateHabit, onDeleteHabit, onPushCommit, onOpenSettings, loading,
}: TopNavProps) {
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-30 bg-[rgb(var(--paper))] border-b-2 border-[rgb(var(--border))]">
            {/* Row 1 */}
            <div className="flex items-center justify-between px-4 sm:px-6 h-12 border-b-2 border-[rgb(var(--border))]">
                <button onClick={() => onSelectHabit(null)} className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 border-2 border-[rgb(var(--border))] flex items-center justify-center bg-brand-500">
                        <span className="text-white font-black text-[10px] font-mono">hG</span>
                    </div>
                    <span className="font-black text-sm tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        haGIT
                    </span>
                </button>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onPushCommit}
                        className="btn-press-sm flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal-sm transition-all"
                    >
                        <GitCommitHorizontal size={12} strokeWidth={2.5} />
                        <span className="hidden sm:inline">Push commit</span>
                        <span className="sm:hidden">Push</span>
                    </button>

                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="w-8 h-8 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                    </button>

                    <button
                        onClick={onOpenSettings}
                        className="w-8 h-8 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
                        aria-label="Settings"
                    >
                        <Settings size={13} />
                    </button>
                </div>
            </div>

            {/* Row 2 — habit tabs */}
            <div className="flex items-stretch overflow-x-auto scrollbar-none h-9">
                <Tab active={selectedHabitId === null} onClick={() => onSelectHabit(null)}>
                    All
                </Tab>

                {loading
                    ? [1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center px-3 self-center">
                            <div className="h-4 shimmer-bg rounded" style={{ width: 50 + i * 14 }} />
                        </div>
                    ))
                    : habits.map((habit) => (
                        <HabitTab
                            key={habit.id}
                            habit={habit}
                            active={selectedHabitId === habit.id}
                            onClick={() => onSelectHabit(habit.id)}
                            onDelete={() => onDeleteHabit(habit)}
                        />
                    ))}

                <button
                    onClick={onCreateHabit}
                    className="flex-shrink-0 flex items-center gap-1 px-3 text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-brand-600 dark:hover:text-brand-400 hover:bg-[rgb(var(--paper-alt))] transition-colors border-l border-[rgb(var(--border))]"
                    title="New habit"
                >
                    <Plus size={11} strokeWidth={2.5} />
                    <span className="hidden sm:inline">New</span>
                </button>
            </div>
        </header>
    );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-shrink-0 px-4 h-full text-xs font-bold border-r border-[rgb(var(--border))] transition-colors whitespace-nowrap",
                active
                    ? "bg-ink dark:bg-white text-white dark:text-ink"
                    : "hover:bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]"
            )}
        >
            {children}
        </button>
    );
}

function HabitTab({ habit, active, onClick, onDelete }: {
    habit: Habit; active: boolean; onClick: () => void; onDelete: () => void;
}) {
    return (
        <div className={cn(
            "group flex-shrink-0 flex items-stretch border-r border-[rgb(var(--border))]",
            active ? "bg-ink dark:bg-white" : ""
        )}>
            <button
                onClick={onClick}
                className={cn(
                    "flex items-center gap-2 pl-4 pr-2 h-full text-xs font-bold transition-colors whitespace-nowrap",
                    active
                        ? "text-white dark:text-ink"
                        : "hover:bg-[rgb(var(--paper-alt))] text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]"
                )}
            >
                <span>{habit.name}</span>
                <span className={cn(
                    "font-mono tabular-nums text-[10px]",
                    active ? "opacity-70" : "text-[rgb(var(--ink-muted))]"
                )}>
                    {habit.commitCount}
                </span>
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className={cn(
                    "flex items-center justify-center w-6 opacity-0 group-hover:opacity-100 transition-all pr-1",
                    active ? "text-white/60 dark:text-ink/60 hover:text-red-400" : "text-[rgb(var(--ink-muted))] hover:text-red-500"
                )}
                title="Delete habit"
            >
                <X size={9} strokeWidth={3} />
            </button>
        </div>
    );
}
