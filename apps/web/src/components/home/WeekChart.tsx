"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import type { HabitView } from "./types";

const PLOT_H = 120;
const GAP = 2;

/** Commits per day for the last 7 days, stacked by habit in identity colours. */
export function WeekChart({ habits }: { habits: HabitView[] }) {
    const [hover, setHover] = useState<number | null>(null);
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        const parts = habits
            .map((h) => ({ habit: h, count: h.recent[h.recent.length - 7 + i] ?? 0 }))
            .filter((p) => p.count > 0);
        return { date, parts, total: parts.reduce((s, p) => s + p.count, 0) };
    });
    const max = Math.max(1, ...days.map((d) => d.total));
    const top = max <= 4 ? max : Math.ceil(max / 2) * 2;
    const total = days.reduce((s, d) => s + d.total, 0);
    const activeDays = days.filter((d) => d.total > 0).length;
    const series = habits.filter((h) => h.recent.slice(-7).some(Boolean));

    return (
        <div>
            <p className="text-sm mb-3">
                <b className="font-mono">{total}</b> commit{total === 1 ? "" : "s"} · <b className="font-mono">{activeDays}</b>/7 active days
            </p>

            <div className="relative flex" onMouseLeave={() => setHover(null)}>
                {/* y axis: baseline, midline and top value */}
                <div className="relative w-6 flex-shrink-0 text-[9px] font-mono text-[rgb(var(--ink-muted))]" style={{ height: PLOT_H }}>
                    <span className="absolute right-1.5 -top-1.5">{top}</span>
                    <span className="absolute right-1.5 bottom-[-6px]">0</span>
                </div>
                <div className="relative flex-1">
                    <div className="absolute inset-x-0 top-0 border-t border-dashed border-[rgb(var(--ink)/0.12)]" />
                    <div className="absolute inset-x-0 border-t border-dashed border-[rgb(var(--ink)/0.12)]" style={{ top: PLOT_H / 2 }} />
                    <div className="relative grid grid-cols-7" style={{ height: PLOT_H }}>
                        {days.map((d, i) => (
                            <button
                                key={i}
                                type="button"
                                onMouseEnter={() => setHover(i)}
                                onFocus={() => setHover(i)}
                                onBlur={() => setHover(null)}
                                aria-label={`${format(d.date, "EEEE")}: ${d.total} commit${d.total === 1 ? "" : "s"}`}
                                className="relative flex flex-col-reverse items-center justify-start h-full outline-none focus-visible:bg-[rgb(var(--paper-alt))]"
                                style={{ background: hover === i ? "rgb(var(--ink) / 0.04)" : undefined }}
                            >
                                <div className="flex flex-col-reverse w-full max-w-[24px]" style={{ gap: GAP }}>
                                    {d.parts.map((p, j) => (
                                        <span
                                            key={p.habit.habitId}
                                            className={j === d.parts.length - 1 ? "rounded-t-[4px]" : ""}
                                            style={{
                                                height: Math.max(3, (p.count / top) * PLOT_H - GAP),
                                                background: p.habit.color,
                                                opacity: hover === null || hover === i ? 1 : 0.55,
                                            }}
                                        />
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="border-t-2 border-[rgb(var(--border))]" />
                    <div className="grid grid-cols-7 mt-1.5">
                        {days.map((d, i) => (
                            <span key={i} className={`text-center text-[10px] font-bold ${i === 6 ? "text-[rgb(var(--ink))]" : "text-[rgb(var(--ink-muted))]"}`}>
                                {i === 6 ? "Today" : format(d.date, "EEE")}
                            </span>
                        ))}
                    </div>

                    {hover !== null && (
                        <div
                            className="absolute z-10 top-0 min-w-[8.5rem] px-2.5 py-2 bg-ink text-white text-xs shadow-brutal-sm pointer-events-none"
                            style={{ left: `${((hover + 0.5) / 7) * 100}%`, transform: "translate(-50%, calc(-100% - 8px))" }}
                        >
                            <p className="font-bold mb-1">{format(days[hover].date, "EEE d MMM")}</p>
                            {days[hover].parts.length === 0 ? (
                                <p className="text-white/60">No commits</p>
                            ) : (
                                days[hover].parts.map((p) => (
                                    <p key={p.habit.habitId} className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 flex-shrink-0" style={{ background: p.habit.color }} />
                                        <span className="truncate max-w-[7rem]">{p.habit.habitName}</span>
                                        <span className="ml-auto font-mono pl-2">{p.count}</span>
                                    </p>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {series.length > 1 && (
                <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-3" aria-label="Legend">
                    {series.map((h) => (
                        <li key={h.habitId} className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--ink-muted))] max-w-[10rem]">
                            <span className="w-2.5 h-2.5 flex-shrink-0 rounded-[2px]" style={{ background: h.color }} />
                            <span className="truncate">{h.habitName}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
