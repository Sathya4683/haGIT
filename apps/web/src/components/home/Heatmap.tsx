"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfYear, format, getDay, startOfWeek, startOfYear, subWeeks } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { seriesColor } from "@/lib/habit-colors";

interface Props {
    /** Commit counts keyed by local yyyy-MM-dd. */
    counts: Record<string, number>;
    onDayClick?: (date: string) => void;
    selectedDate?: string | null;
    /** Habit colour slot for single-habit maps; defaults to the brand ramp. */
    slot?: number;
}

const GAP = 3;
const ROLLING = "rolling";

/** Sequential steps: brand ramp tokens, or the habit colour at increasing opacity. */
function fill(count: number, slot?: number) {
    const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
    if (level === 0) return "rgb(var(--heat-0))";
    if (slot !== undefined) return seriesColor(slot, [0, 0.45, 0.65, 0.82, 1][level]);
    return `rgb(var(--heat-${level}))`;
}

export function Heatmap({ counts, onDayClick, selectedDate, slot }: Props) {
    const [range, setRange] = useState<string>(ROLLING);
    const [open, setOpen] = useState(false);
    const [tip, setTip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
    const scroller = useRef<HTMLDivElement>(null);
    // Cells grow to fill wide cards; narrow screens keep a minimum size and scroll.
    const [cell, setCell] = useState(12);

    const years = useMemo(() => {
        const set = new Set(Object.keys(counts).map((d) => Number(d.slice(0, 4))));
        set.add(new Date().getFullYear());
        return Array.from(set).sort((a, b) => b - a);
    }, [counts]);

    const { weeks, months, total } = useMemo(() => {
        const today = new Date();
        let start: Date;
        let end: Date;
        if (range === ROLLING) {
            end = today;
            start = startOfWeek(subWeeks(today, 52));
        } else {
            const y = new Date(Number(range), 0, 1);
            start = startOfWeek(startOfYear(y));
            end = endOfYear(y);
        }
        const weeksArr: { date: Date; key: string; inRange: boolean }[][] = [];
        let cursor = start;
        let sum = 0;
        while (cursor <= end || getDay(cursor) !== 0) {
            if (getDay(cursor) === 0) weeksArr.push([]);
            const key = format(cursor, "yyyy-MM-dd");
            const inRange = cursor <= end && (range === ROLLING || cursor.getFullYear() === Number(range));
            if (inRange) sum += counts[key] ?? 0;
            weeksArr[weeksArr.length - 1].push({ date: cursor, key, inRange });
            cursor = addDays(cursor, 1);
            if (weeksArr.length > 54) break;
        }
        const monthLabels: { label: string; index: number }[] = [];
        let lastMonth = -1;
        weeksArr.forEach((w, i) => {
            const d = w.find((x) => x.inRange);
            if (!d || d.date.getMonth() === lastMonth) return;
            lastMonth = d.date.getMonth();
            const prev = monthLabels[monthLabels.length - 1];
            if (!prev || i - prev.index >= 3) monthLabels.push({ label: format(d.date, "MMM"), index: i });
        });
        return { weeks: weeksArr, months: monthLabels, total: sum };
    }, [counts, range]);

    useEffect(() => {
        const el = scroller.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const fit = () => {
            const fitted = Math.floor((el.clientWidth - 30) / weeks.length) - GAP;
            setCell(fitted >= 9 ? Math.min(16, fitted) : 11);
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, [weeks.length]);

    // Narrow screens overflow; start at the most recent week.
    useEffect(() => {
        const el = scroller.current;
        if (el) el.scrollLeft = range === ROLLING || Number(range) === new Date().getFullYear() ? el.scrollWidth : 0;
    }, [range, weeks.length, cell]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                    <b className="font-mono">{total}</b> commit{total === 1 ? "" : "s"} {range === ROLLING ? "in the last year" : `in ${range}`}
                </p>
                <div className="relative">
                    <button
                        onClick={() => setOpen((o) => !o)}
                        className="flex items-center gap-1 h-8 px-2.5 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]"
                        aria-haspopup="listbox" aria-expanded={open}
                    >
                        {range === ROLLING ? "Last 12 months" : range}
                        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
                    </button>
                    {open && (
                        <div role="listbox" className="absolute right-0 top-full mt-1 z-20 min-w-[9rem] p-1 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] shadow-brutal dark:shadow-brutal-dark">
                            {[ROLLING, ...years.map(String)].map((r) => (
                                <button
                                    key={r} role="option" aria-selected={r === range}
                                    onClick={() => { setRange(r); setOpen(false); }}
                                    className={cn("w-full text-left px-2.5 py-1.5 text-xs font-bold hover:bg-[rgb(var(--paper-alt))]", r === range && "text-brand-600 dark:text-brand-400")}
                                >
                                    {r === ROLLING ? "Last 12 months" : r}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div ref={scroller} className="overflow-x-auto scrollbar-thin pb-1">
                <div className="inline-flex flex-col">
                    <div className="relative h-4 ml-7" style={{ width: weeks.length * (cell + GAP) }}>
                        {months.map((m) => (
                            <span key={`${m.label}-${m.index}`} className="absolute text-[10px] font-bold text-[rgb(var(--ink-muted))]" style={{ left: m.index * (cell + GAP) }}>
                                {m.label}
                            </span>
                        ))}
                    </div>
                    <div className="flex">
                        <div className="flex flex-col w-7 text-[9px] font-bold text-[rgb(var(--ink-muted))]" style={{ gap: GAP }}>
                            {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                                <span key={i} style={{ height: cell, lineHeight: `${cell}px` }}>{d}</span>
                            ))}
                        </div>
                        <div className="flex" style={{ gap: GAP }}>
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                                    {week.map(({ date, key, inRange }) => {
                                        if (!inRange) return <span key={key} style={{ width: cell, height: cell }} />;
                                        const count = counts[key] ?? 0;
                                        const show = (el: HTMLElement) => {
                                            const r = el.getBoundingClientRect();
                                            setTip({ date: key, count, x: r.left + r.width / 2, y: r.top });
                                        };
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                aria-label={`${count} commit${count === 1 ? "" : "s"} on ${format(date, "EEEE, MMMM d, yyyy")}`}
                                                aria-pressed={selectedDate === key}
                                                onClick={() => onDayClick?.(key)}
                                                onMouseEnter={(e) => show(e.currentTarget)}
                                                onFocus={(e) => show(e.currentTarget)}
                                                onMouseLeave={() => setTip(null)}
                                                onBlur={() => setTip(null)}
                                                className={cn(
                                                    "rounded-[3px] transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgb(var(--ink))]",
                                                    selectedDate === key && "outline outline-2 outline-offset-1 outline-[rgb(var(--ink))]",
                                                )}
                                                style={{ width: cell, height: cell, background: fill(count, slot) }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-[rgb(var(--ink-muted))]">
                Less
                {[0, 1, 2, 4, 7].map((v) => (
                    <span key={v} className="w-[11px] h-[11px] rounded-[3px]" style={{ background: fill(v, slot) }} />
                ))}
                More
            </div>

            {tip && (
                <div
                    className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full -mt-2 px-2.5 py-1.5 bg-ink text-white text-xs font-bold whitespace-nowrap shadow-brutal-sm"
                    style={{ left: tip.x, top: tip.y - 6 }}
                >
                    <span className="font-mono">{tip.count}</span> commit{tip.count === 1 ? "" : "s"} · {format(new Date(`${tip.date}T00:00:00`), "EEE, MMM d")}
                </div>
            )}
        </div>
    );
}
