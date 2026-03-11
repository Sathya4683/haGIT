"use client";
import type { CommitByHabit } from "@/types";
import { cn } from "@/lib/utils";

interface Props { data: CommitByHabit[]; loading?: boolean; onSelect?: (id: number) => void; }

export function HabitSummaryCards({ data, loading, onSelect }: Props) {
    if (loading) {
        return (
            <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-14 shimmer-bg border-2 border-[rgb(var(--border))]" style={{ opacity: 1 - i * 0.18 }} />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="card-flat p-5 text-center">
                <p className="text-sm font-bold text-[rgb(var(--ink-muted))]">No habits yet.</p>
            </div>
        );
    }

    const sorted = [...data].sort((a, b) => b.commitCount - a.commitCount);
    const max = sorted[0]?.commitCount || 1;

    return (
        <div className="space-y-2">
            {sorted.map((item, i) => {
                const pct = (item.commitCount / max) * 100;
                const isFirst = i === 0;
                return (
                    <button
                        key={item.habitId}
                        onClick={() => onSelect?.(item.habitId)}
                        className={cn(
                            "btn-press-sm group w-full text-left border-2 border-[rgb(var(--border))] p-3 transition-all animate-fade-in",
                            isFirst
                                ? "bg-brand-500 shadow-brutal dark:shadow-brutal-dark hover:bg-brand-600"
                                : "bg-[rgb(var(--card-bg))] hover:bg-[rgb(var(--paper-alt))] shadow-brutal-sm dark:shadow-brutal-sm-dark"
                        )}
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                    "text-[10px] font-black font-mono w-4 flex-shrink-0",
                                    isFirst ? "text-white/60" : "text-[rgb(var(--ink-muted))]"
                                )}>
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className={cn(
                                    "text-sm font-bold truncate",
                                    isFirst ? "text-white" : ""
                                )}>
                                    {item.habitName}
                                </span>
                            </div>
                            <span className={cn(
                                "font-mono font-black tabular-nums text-lg flex-shrink-0",
                                isFirst ? "text-white" : ""
                            )}>
                                {item.commitCount}
                            </span>
                        </div>

                        {/* Proportional bar */}
                        <div className={cn("mt-2 h-1 w-full", isFirst ? "bg-white/20" : "bg-[rgb(var(--paper-alt))]")}>
                            <div
                                className={cn("h-full transition-all duration-700", isFirst ? "bg-white/60" : "bg-brand-500")}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
