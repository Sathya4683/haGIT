"use client";

import { useMemo } from "react";
import { differenceInCalendarDays, format, formatDistanceToNowStrict } from "date-fns";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type { Commit } from "@hagit/types";
import { cn } from "@/lib/utils";
import { Menu } from "@/components/ui/Menu";

const LANE = 14;
const ROW = 46;

export const shortHash = (id: string) => Number(id).toString(16).padStart(4, "0").slice(-4);

function shortAgo(date: Date) {
    const s = formatDistanceToNowStrict(date);
    return s.replace(/ seconds?/, "s").replace(/ minutes?/, "m").replace(/ hours?/, "h").replace(/ days?/, "d").replace(/ months?/, "mo").replace(/ years?/, "y");
}

function dayLabel(date: Date) {
    const diff = differenceInCalendarDays(new Date(), date);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return format(date, "EEEE");
    return format(date, "EEE, d MMM");
}

interface Props {
    commits: Commit[];
    colorOf: (habitName: string) => string;
    /** Lane order: habit names in identity order. */
    habitOrder: string[];
    onDelete: (commit: Commit) => void;
    hasMore?: boolean;
    onLoadMore?: () => void;
    loading?: boolean;
    /** One habit: no day headers or habit chips; rows show their date instead. */
    single?: boolean;
}

/** Recent commits drawn like `git log --graph`: one coloured lane per habit. */
export function ActivityGraph({ commits, colorOf, habitOrder, onDelete, hasMore, onLoadMore, loading, single }: Props) {
    const lanes = useMemo(() => {
        const present = new Set(commits.map((c) => c.habitName));
        return habitOrder.filter((h) => present.has(h)).concat(Array.from(present).filter((h) => !habitOrder.includes(h)));
    }, [commits, habitOrder]);

    const groups = useMemo(() => {
        const out: { label: string; items: Commit[] }[] = [];
        for (const c of commits) {
            const label = dayLabel(new Date(c.timestamp));
            if (out[out.length - 1]?.label !== label) out.push({ label, items: [] });
            out[out.length - 1].items.push(c);
        }
        return out;
    }, [commits]);

    const width = Math.max(1, lanes.length) * LANE + 4;

    if (loading) {
        return <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-10 shimmer-bg" style={{ opacity: 1 - i * 0.15 }} />)}</div>;
    }
    if (commits.length === 0) {
        return (
            <div className="py-10 text-center">
                <p className="font-mono text-sm text-[rgb(var(--ink-muted))]">$ git log</p>
                <p className="font-mono text-sm mt-1">fatal: your current branch has no commits yet</p>
                <p className="text-xs text-[rgb(var(--ink-muted))] mt-3">Commit something from the bar above to start your history.</p>
            </div>
        );
    }

    const Lanes = ({ height, dotLane }: { height: number; dotLane?: number }) => (
        <svg width={width} height={height} className="flex-shrink-0" aria-hidden>
            {lanes.map((h, i) => (
                <line key={h} x1={i * LANE + 7} x2={i * LANE + 7} y1={0} y2={height} stroke={colorOf(h)} strokeOpacity={0.35} strokeWidth={2} />
            ))}
            {dotLane !== undefined && (
                <circle cx={dotLane * LANE + 7} cy={height / 2} r={5} fill={colorOf(lanes[dotLane])} stroke="rgb(var(--card-bg))" strokeWidth={2} />
            )}
        </svg>
    );

    return (
        <div>
            {single
                ? commits.map((c) => (
                    <div key={c.id} className="flex items-stretch">
                        <Lanes height={ROW - 6} dotLane={0} />
                        <CommitRow commit={c} color={colorOf(c.habitName)} onDelete={() => onDelete(c)} bare dated />
                    </div>
                ))
                : groups.map((g) => (
                    <div key={g.label}>
                        <div className="flex items-stretch">
                            <Lanes height={30} />
                            <p className="self-center pl-2 text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">{g.label}</p>
                        </div>
                        {g.items.map((c) => (
                            <div key={c.id} className="flex items-stretch">
                                <Lanes height={ROW} dotLane={lanes.indexOf(c.habitName)} />
                                <CommitRow commit={c} color={colorOf(c.habitName)} onDelete={() => onDelete(c)} bare />
                            </div>
                        ))}
                    </div>
                ))}
            {hasMore && (
                <button onClick={onLoadMore} className="mt-3 w-full py-2 text-xs font-bold border-2 border-dashed border-[rgb(var(--border))] hover:border-solid hover:bg-[rgb(var(--paper-alt))]">
                    git log --more
                </button>
            )}
        </div>
    );
}

/** One commit: hash, message, habit, time and a delete action. */
export function CommitRow({ commit, color, onDelete, compact, bare, dated }: {
    commit: Commit;
    color: string;
    onDelete?: () => void;
    /** Inside a single day: time of day, no habit chip. */
    compact?: boolean;
    /** Inside the graph (no own dot or padding). */
    bare?: boolean;
    /** Single-habit log: calendar date, no habit chip. */
    dated?: boolean;
}) {
    const date = new Date(commit.timestamp);
    return (
        <div
            className={cn(
                "group flex-1 min-w-0 flex items-center gap-2.5 pr-1 hover:bg-[rgb(var(--paper-alt))] transition-colors",
                bare ? "pl-2" : "px-4 py-2.5 border-b border-dashed border-[rgb(var(--border))]/40 last:border-0",
            )}
            style={bare ? { height: dated ? ROW - 6 : ROW } : undefined}
        >
            {!bare && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />}
            <span className="font-mono text-[11px] text-[rgb(var(--ink-muted))] flex-shrink-0 hidden sm:inline">{shortHash(commit.id)}</span>
            <p className="flex-1 min-w-0 truncate text-sm font-medium" title={commit.message}>{commit.message}</p>
            {!compact && !dated && (
                <span className="hidden sm:inline-flex items-center gap-1.5 flex-shrink-0 max-w-[9rem] px-1.5 py-0.5 text-[10px] font-bold border border-[rgb(var(--border))]/50">
                    <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: color }} />
                    <span className="truncate">{commit.habitName}</span>
                </span>
            )}
            <time dateTime={commit.timestamp} title={format(date, "PPpp")} className={cn("font-mono text-[11px] text-[rgb(var(--ink-muted))] flex-shrink-0 text-right", dated ? "w-24" : "w-9")}>
                {compact ? format(date, "HH:mm") : dated ? format(date, "EEE d MMM") : shortAgo(date)}
            </time>
            {onDelete && (
                <Menu
                    trigger={
                        <button aria-label="Commit options" className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100">
                            <MoreHorizontal size={15} />
                        </button>
                    }
                    items={[{ label: "Delete commit", icon: <Trash2 size={13} />, onSelect: onDelete, danger: true }]}
                />
            )}
        </div>
    );
}
