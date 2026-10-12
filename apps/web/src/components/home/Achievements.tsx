"use client";

import { CalendarCheck, Flame, GitCommitHorizontal, Layers, Lock, Mountain, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitView } from "./types";

interface Badge {
    id: string;
    title: string;
    hint: string;
    icon: typeof Flame;
    tint: string;
    progress: number;
    goal: number;
}

/** Milestone badges derived from habit stats; locked ones show progress. */
export function achievements(habits: HabitView[], totalCommits: number): Badge[] {
    const longest = Math.max(0, ...habits.map((h) => h.longestStreak));
    const days = Array.from({ length: 7 }, (_, i) => habits.reduce((s, h) => s + (h.recent[h.recent.length - 7 + i] ?? 0), 0));
    const activeDays = days.filter(Boolean).length;
    const activeHabits = habits.filter((h) => h.recent.slice(-7).some(Boolean)).length;
    return [
        { id: "first", title: "git init", hint: "Your first commit", icon: Rocket, tint: "var(--series-1)", progress: Math.min(totalCommits, 1), goal: 1 },
        { id: "streak7", title: "On fire", hint: "7-day streak", icon: Flame, tint: "var(--series-2)", progress: Math.min(longest, 7), goal: 7 },
        { id: "week", title: "Perfect week", hint: "A commit every day for 7 days", icon: CalendarCheck, tint: "var(--series-3)", progress: activeDays, goal: 7 },
        { id: "multi", title: "Multi-branch", hint: "3 habits active this week", icon: Layers, tint: "var(--series-7)", progress: Math.min(activeHabits, 3), goal: 3 },
        { id: "c100", title: "Centurion", hint: "100 commits", icon: GitCommitHorizontal, tint: "var(--series-4)", progress: Math.min(totalCommits, 100), goal: 100 },
        { id: "streak30", title: "Summit", hint: "30-day streak", icon: Mountain, tint: "var(--series-5)", progress: Math.min(longest, 30), goal: 30 },
    ];
}

export function Achievements({ habits, totalCommits }: { habits: HabitView[]; totalCommits: number }) {
    const badges = achievements(habits, totalCommits);
    const earned = badges.filter((b) => b.progress >= b.goal).length;
    return (
        <div>
            <p className="text-sm mb-3"><b className="font-mono">{earned}</b> of {badges.length} unlocked</p>
            <ul className="grid grid-cols-3 gap-2">
                {badges.map((b) => {
                    const done = b.progress >= b.goal;
                    const Icon = b.icon;
                    return (
                        <li
                            key={b.id}
                            title={`${b.hint}${done ? " · unlocked" : ` · ${b.progress}/${b.goal}`}`}
                            className={cn(
                                "relative flex flex-col items-center text-center gap-1.5 px-1 pt-3 pb-2 border-2",
                                done ? "border-[rgb(var(--border))] bg-[rgb(var(--card-bg))]" : "border-dashed border-[rgb(var(--border))]/50",
                            )}
                        >
                            <span
                                className={cn("w-10 h-10 flex items-center justify-center rounded-full border-2", done ? "border-ink" : "border-transparent")}
                                style={{ background: done ? `rgb(${b.tint})` : "rgb(var(--paper-alt))", color: done ? "white" : "rgb(var(--ink-muted))" }}
                            >
                                {done ? <Icon size={18} strokeWidth={2.5} /> : <Lock size={14} />}
                            </span>
                            <span className={cn("text-[11px] font-black leading-tight", !done && "text-[rgb(var(--ink-muted))]")}>{b.title}</span>
                            {done ? (
                                <span className="text-[9px] text-[rgb(var(--ink-muted))] leading-tight">{b.hint}</span>
                            ) : (
                                <span className="w-full px-1.5">
                                    <span className="block h-1 bg-[rgb(var(--paper-alt))] overflow-hidden rounded-full">
                                        <span className="block h-full rounded-full" style={{ width: `${(b.progress / b.goal) * 100}%`, background: `rgb(${b.tint})` }} />
                                    </span>
                                    <span className="block mt-1 text-[9px] font-mono text-[rgb(var(--ink-muted))]">{b.progress}/{b.goal}</span>
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
