"use client";

import { useState } from "react";

/** Small trend line for KPI cards. `values` are oldest first. */
export function Sparkline({ values, color = "rgb(var(--brand-500))", height = 32, label }: { values: number[]; color?: string; height?: number; label: string }) {
    const w = 120;
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)] as const);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const last = pts[pts.length - 1];
    return (
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={label}>
            <path d={`${line} L${w},${height} L0,${height} Z`} fill={color} opacity={0.12} />
            <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {last && <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="rgb(var(--card-bg))" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
        </svg>
    );
}

export interface DayPoint {
    /** yyyy-mm-dd (UTC). */
    date: string;
    value: number;
    secondary?: number;
}

/** Daily bars with a hover tooltip. One series; `secondary` is shown in the tooltip only. */
export function DailyBars({ data, label, secondaryLabel, height = 160 }: { data: DayPoint[]; label: string; secondaryLabel?: string; height?: number }) {
    const [hover, setHover] = useState<number | null>(null);
    const max = Math.max(1, ...data.map((d) => d.value));
    const top = max <= 4 ? max : Math.ceil(max / 5) * 5;
    const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });

    return (
        <div className="relative" onMouseLeave={() => setHover(null)}>
            <div className="flex">
                <div className="relative w-7 flex-shrink-0 text-[10px] font-mono text-[rgb(var(--ink-muted))]" style={{ height }}>
                    <span className="absolute right-2 -top-1.5">{top}</span>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">{Math.round(top / 2)}</span>
                    <span className="absolute right-2 -bottom-1.5">0</span>
                </div>
                <div className="relative flex-1 min-w-0">
                    <div className="absolute inset-x-0 top-0 border-t border-dashed border-[rgb(var(--ink)/0.12)]" />
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[rgb(var(--ink)/0.12)]" />
                    <div className="relative flex items-end" style={{ height, gap: 2 }}>
                        {data.map((d, i) => (
                            <button
                                key={d.date}
                                type="button"
                                onMouseEnter={() => setHover(i)}
                                onFocus={() => setHover(i)}
                                onBlur={() => setHover(null)}
                                aria-label={`${fmt(d.date, { day: "numeric", month: "short" })}: ${d.value} ${label}`}
                                className="flex-1 h-full flex items-end justify-center outline-none"
                            >
                                <span
                                    className="w-full max-w-[24px] rounded-t-[4px] transition-opacity"
                                    style={{
                                        height: d.value ? `${Math.max(2, (d.value / top) * 100)}%` : 2,
                                        background: d.value ? "rgb(var(--brand-500))" : "rgb(var(--ink) / 0.1)",
                                        opacity: hover === null || hover === i ? 1 : 0.45,
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                    <div className="border-t-2 border-[rgb(var(--border))]" />
                    <div className="flex justify-between mt-1.5 text-[10px] font-mono text-[rgb(var(--ink-muted))]">
                        <span>{data[0] && fmt(data[0].date, { day: "numeric", month: "short" })}</span>
                        <span>{data[Math.floor(data.length / 2)] && fmt(data[Math.floor(data.length / 2)].date, { day: "numeric", month: "short" })}</span>
                        <span>today</span>
                    </div>

                    {hover !== null && data[hover] && (
                        <div
                            className="absolute z-10 top-0 px-2.5 py-1.5 bg-ink text-white text-xs whitespace-nowrap shadow-brutal-sm pointer-events-none"
                            style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: `translate(${hover > data.length * 0.75 ? "-100%" : hover < data.length * 0.25 ? "0" : "-50%"}, calc(-100% - 6px))` }}
                        >
                            <p className="font-bold">{fmt(data[hover].date, { weekday: "short", day: "numeric", month: "short" })}</p>
                            <p><span className="font-mono">{data[hover].value}</span> {label}</p>
                            {secondaryLabel && data[hover].secondary !== undefined && (
                                <p className="text-white/70"><span className="font-mono">{data[hover].secondary}</span> {secondaryLabel}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
