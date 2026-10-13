"use client";

import { format } from "date-fns";
import { Flame, GitCommitHorizontal, Moon, Sparkles, Sun, Sunrise, Trophy } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { displayName } from "@/components/ui/Avatar";
import { QuickCommit } from "./QuickCommit";
import type { HabitView } from "./types";

interface Props {
    email?: string | null;
    habits: HabitView[];
    weekCommits: number;
    lastWeekCommits: number;
    totalCommits: number;
    onCommitted: (habit: HabitView) => void;
    onCreateHabit: () => void;
}

function greeting(hour: number) {
    if (hour < 5) return { text: "Burning the midnight oil", Icon: Moon };
    if (hour < 12) return { text: "Good morning", Icon: Sunrise };
    if (hour < 17) return { text: "Good afternoon", Icon: Sun };
    return { text: "Good evening", Icon: Moon };
}

function motivation(done: number, total: number, bestStreak: number) {
    if (total === 0) return "Let's create your first habit: small and specific beats ambitious.";
    if (done === total) return "Every habit committed today. That's a perfect day.";
    if (done === 0 && bestStreak > 1) return `Your ${bestStreak}-day streak is waiting for today's commit.`;
    if (done === 0) return "A fresh day. One small commit gets the ball rolling.";
    const left = total - done;
    return `${left} more to close out the day. You've got this.`;
}

export function Hero({ email, habits, weekCommits, lastWeekCommits, totalCommits, onCommitted, onCreateHabit }: Props) {
    const now = new Date();
    const done = habits.filter((h) => h.committedToday).length;
    const best = [...habits].sort((a, b) => b.currentStreak - a.currentStreak)[0];
    const longest = Math.max(0, ...habits.map((h) => h.longestStreak));
    const { text, Icon } = greeting(now.getHours());
    const delta = weekCommits - lastWeekCommits;
    const allDone = habits.length > 0 && done === habits.length;

    return (
        <section className="card relative overflow-hidden">
            <div className="absolute inset-0 dot-grid opacity-70 pointer-events-none" aria-hidden />
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-brand-500/10 blur-2xl pointer-events-none" aria-hidden />
            <div className="relative p-5 sm:p-7 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0 space-y-4">
                    <div className="space-y-1.5">
                        {/* Phones: the ring floats right, so only the lines beside it wrap around it. */}
                        <div className="md:hidden float-right ml-3 -mt-1 -mb-4">
                            <ProgressRing value={done} max={habits.length} size={52} stroke={6} label={`${done} of ${habits.length} habits done today`}>
                                <span className="font-mono text-sm font-black">{done}/{habits.length}</span>
                            </ProgressRing>
                        </div>
                        <p className="font-mono text-xs text-[rgb(var(--ink-muted))] flex items-center gap-1.5">
                            <Icon size={13} /> {format(now, "EEEE, d MMMM")}
                        </p>
                        <h1 className="text-[28px] sm:text-4xl font-black tracking-tight leading-[1.1] [overflow-wrap:anywhere]">
                            {text}, {displayName(email)}
                            {allDone && <Sparkles className="inline ml-2 text-brand-500 -mt-1" size={26} />}
                        </h1>
                        <p className="text-sm sm:text-[15px] text-[rgb(var(--ink-muted))]">{motivation(done, habits.length, best?.currentStreak ?? 0)}</p>
                    </div>

                    {habits.length > 0 ? (
                        <QuickCommit habits={habits} onCommitted={onCommitted} />
                    ) : (
                        <button
                            onClick={onCreateHabit}
                            className="btn-press w-full sm:w-auto text-left bg-ink text-white border-2 border-ink shadow-brutal px-4 py-3 font-mono text-sm"
                        >
                            <span className="text-brand-400">$</span> hagit branch -m <span className="text-white/50">&quot;your first habit&quot;</span> <span className="ml-2 text-brand-400">⏎</span>
                        </button>
                    )}

                    <div className="grid grid-cols-3 gap-2 max-w-xl">
                        <Stat
                            icon={<Flame size={14} className={best?.currentStreak ? "text-orange-500" : ""} />}
                            value={best?.currentStreak ?? 0}
                            label={best?.currentStreak ? `day streak · ${best.habitName}` : "day streak"}
                        />
                        <Stat
                            icon={<GitCommitHorizontal size={14} />}
                            value={weekCommits}
                            label="this week"
                            trend={lastWeekCommits > 0 && delta !== 0 ? (
                                <span className={delta > 0 ? "text-brand-600 dark:text-brand-400" : "text-[rgb(var(--ink-muted))]"}>
                                    {delta > 0 ? "▲" : "▼"}{Math.abs(delta)}
                                </span>
                            ) : null}
                        />
                        <Stat icon={<Trophy size={14} />} value={totalCommits} label={`commits · best ${longest}d`} />
                    </div>
                </div>

                <div className="hidden md:flex flex-col items-center gap-2 pr-2">
                    <ProgressRing value={done} max={habits.length} size={132} stroke={12} label={`${done} of ${habits.length} habits done today`}>
                        <span className="font-mono text-3xl font-black leading-none">{done}<span className="text-[rgb(var(--ink-muted))] text-lg">/{habits.length}</span></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--ink-muted))] mt-1">today</span>
                    </ProgressRing>
                </div>
            </div>
        </section>
    );
}

function Stat({ icon, value, label, trend }: { icon: React.ReactNode; value: number; label: string; trend?: React.ReactNode }) {
    return (
        <div className="min-w-0 px-2.5 py-2 sm:px-3 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))]">
            <div className="flex items-center gap-1.5">
                <span className="text-[rgb(var(--ink-muted))]">{icon}</span>
                <span className="font-mono text-lg sm:text-xl font-black leading-none tabular-nums">{value}</span>
                {trend && <span className="font-mono text-[10px] font-bold">{trend}</span>}
            </div>
            <p className="text-[10px] sm:text-[11px] leading-tight text-[rgb(var(--ink-muted))] mt-1 line-clamp-2 sm:truncate break-words" title={label}>{label}</p>
        </div>
    );
}
