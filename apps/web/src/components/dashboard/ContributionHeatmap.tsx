"use client";

import { useMemo, useState } from "react";
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay, getMonth } from "date-fns";
import type { AggregatedCommit } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface Props {
    data: AggregatedCommit[];
    onDayClick?: (date: string) => void;
    selectedDate?: string | null;
}

const CELL = 12;
const GAP = 3;

function getColorClass(count: number): string {
    if (count === 0) return "bg-[rgb(var(--paper-alt))] border border-[rgb(var(--border))]";
    if (count === 1) return "bg-brand-200 dark:bg-brand-900 border border-brand-300 dark:border-brand-700";
    if (count <= 3) return "bg-brand-300 dark:bg-brand-800 border border-brand-400 dark:border-brand-600";
    if (count <= 6) return "bg-brand-400 border border-brand-500";
    if (count <= 9) return "bg-brand-500 border border-brand-600";
    return "bg-brand-600 border border-brand-700 border-2";
}

export function ContributionHeatmap({ data, onDayClick, selectedDate }: Props) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
    const [yearDropdown, setYearDropdown] = useState(false);

    const years = useMemo(() => {
        const all = new Set(data.map((d) => new Date(d.date).getFullYear()));
        all.add(currentYear);
        return Array.from(all).sort((a, b) => b - a);
    }, [data, currentYear]);

    const countMap = useMemo(() => {
        const m: Record<string, number> = {};
        data.forEach((d) => { m[d.date] = d.count; });
        return m;
    }, [data]);

    const { weeks, monthLabels } = useMemo(() => {
        const start = startOfYear(new Date(year, 0, 1));
        const end = endOfYear(new Date(year, 0, 1));
        const allDays = eachDayOfInterval({ start, end });
        const padded: (Date | null)[] = [...Array(getDay(start)).fill(null), ...allDays];
        const weeksArr: (Date | null)[][] = [];
        for (let i = 0; i < padded.length; i += 7) weeksArr.push(padded.slice(i, i + 7));
        while (weeksArr[weeksArr.length - 1].length < 7) weeksArr[weeksArr.length - 1].push(null);

        const monthLabelMap: { label: string; weekIndex: number }[] = [];
        let lastMonth = -1;
        weeksArr.forEach((week, wi) => {
            const first = week.find((d) => d !== null);
            if (first) {
                const m = getMonth(first);
                if (m !== lastMonth) { monthLabelMap.push({ label: format(first, "MMM"), weekIndex: wi }); lastMonth = m; }
            }
        });
        return { weeks: weeksArr, monthLabels: monthLabelMap };
    }, [year]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative">
                    <button
                        onClick={() => setYearDropdown(!yearDropdown)}
                        className="flex items-center gap-1.5 text-sm font-black hover:text-brand-600 dark:hover:text-brand-400 transition-colors border-b-2 border-[rgb(var(--border))] pb-0.5"
                    >
                        {year}
                        <ChevronDown size={13} className={cn("transition-transform", yearDropdown && "rotate-180")} />
                    </button>
                    {yearDropdown && (
                        <div className="absolute top-full mt-1 left-0 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] shadow-brutal dark:shadow-brutal-dark z-20 min-w-[72px]">
                            {years.map((y) => (
                                <button
                                    key={y}
                                    onClick={() => { setYear(y); setYearDropdown(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-sm font-bold hover:bg-[rgb(var(--paper-alt))] transition-colors",
                                        y === year ? "text-brand-600 dark:text-brand-400" : ""
                                    )}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[rgb(var(--ink-muted))] uppercase tracking-wider">
                    <span>Less</span>
                    {[0, 1, 3, 6, 10].map((v, i) => (
                        <div key={i} className={cn("w-3 h-3", getColorClass(v))} />
                    ))}
                    <span>More</span>
                </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin pb-2">
                <div className="inline-flex gap-0">
                    <div className="flex flex-col justify-around mr-1.5" style={{ paddingTop: 16 }}>
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                            <div key={i} style={{ height: CELL + GAP }} className="flex items-center">
                                {i % 2 === 1
                                    ? <span className="text-[9px] font-bold text-[rgb(var(--ink-muted))] w-3 text-right">{d}</span>
                                    : <span className="w-3" />}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col">
                        <div className="flex mb-1" style={{ height: 14 }}>
                            {weeks.map((_, wi) => {
                                const label = monthLabels.find((m) => m.weekIndex === wi);
                                return (
                                    <div key={wi} style={{ width: CELL + GAP }} className="flex-shrink-0 flex items-end">
                                        {label && <span className="text-[9px] font-black text-[rgb(var(--ink-muted))] whitespace-nowrap uppercase">{label.label}</span>}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex" style={{ gap: GAP }}>
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                                    {week.map((day, di) => {
                                        if (!day) return <div key={di} style={{ width: CELL, height: CELL }} />;
                                        const dateStr = format(day, "yyyy-MM-dd");
                                        const count = countMap[dateStr] || 0;
                                        const isSelected = selectedDate === dateStr;
                                        return (
                                            <div
                                                key={di}
                                                style={{ width: CELL, height: CELL }}
                                                className={cn(
                                                    "cursor-pointer transition-all duration-100 hover:scale-125",
                                                    getColorClass(count),
                                                    isSelected && "ring-2 ring-ink dark:ring-white ring-offset-1 scale-125"
                                                )}
                                                onMouseEnter={(e) => {
                                                    const r = (e.target as HTMLElement).getBoundingClientRect();
                                                    setTooltip({ date: dateStr, count, x: r.left, y: r.top });
                                                }}
                                                onMouseLeave={() => setTooltip(null)}
                                                onClick={() => onDayClick?.(dateStr)}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {tooltip && (
                <div
                    className="fixed z-50 pointer-events-none px-2.5 py-1.5 bg-ink text-white text-xs font-bold border-2 border-ink whitespace-nowrap"
                    style={{ left: tooltip.x, top: tooltip.y - 38 }}
                >
                    {tooltip.count} commit{tooltip.count !== 1 ? "s" : ""} — {format(new Date(tooltip.date + "T00:00:00"), "MMM d, yyyy")}
                </div>
            )}
        </div>
    );
}
