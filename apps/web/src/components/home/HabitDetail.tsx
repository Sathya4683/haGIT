"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Eraser, Flame, GitBranch, GitCommitHorizontal, Moon, MoreHorizontal, PenLine, Sun, Sunrise, Sunset, Target, Trash2, Trophy } from "lucide-react";
import type { Commit, HabitDetail as HabitDetailData } from "@hagit/types";
import { addDaysToKey, getUserTimezone, localDayKey } from "@/lib/datetime";
import { Menu } from "@/components/ui/Menu";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ActivityGraph } from "./ActivityGraph";
import { DayCommits } from "./DayCommits";
import { Heatmap } from "./Heatmap";
import { QuickCommit } from "./QuickCommit";
import { Card, SectionTitle } from "./Section";
import type { HabitView } from "./types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_PARTS = [
    { label: "Morning", icon: Sunrise },
    { label: "Afternoon", icon: Sun },
    { label: "Evening", icon: Sunset },
    { label: "Night", icon: Moon },
];
const PAGE = 20;

interface Props {
    habit: HabitView;
    habits: HabitView[];
    detail: HabitDetailData | null;
    loading: boolean;
    onBack: () => void;
    onCommitted: (habit: HabitView) => void;
    onDeleteCommit: (commit: Commit) => void;
    onRename: () => void;
    onClear: () => void;
    onDelete: () => void;
}

export function HabitDetail({ habit, habits, detail, loading, onBack, onCommitted, onDeleteCommit, onRename, onClear, onDelete }: Props) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [shown, setShown] = useState(PAGE);
    const tz = getUserTimezone();

    const commits: Commit[] = useMemo(
        () => (detail?.commits ?? []).map((c) => ({ id: String(c.id), habitName: habit.habitName, message: c.message, timestamp: c.timestamp || c.createdAt, synced: true })),
        [detail, habit.habitName],
    );

    const { counts, weekdays, last30 } = useMemo(() => {
        const counts: Record<string, number> = {};
        const weekdays = [0, 0, 0, 0, 0, 0, 0];
        for (const c of commits) {
            const key = localDayKey(c.timestamp, tz);
            counts[key] = (counts[key] ?? 0) + 1;
        }
        for (const key of Object.keys(counts)) weekdays[(new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7] += 1;
        const today = localDayKey(new Date(), tz);
        const last30 = Array.from({ length: 30 }, (_, i) => counts[addDaysToKey(today, i - 29)] ?? 0);
        return { counts, weekdays, last30 };
    }, [commits, tz]);

    const dayParts = useMemo(() => {
        const parts = DAY_PARTS.map((p) => ({ ...p, count: 0 }));
        for (const c of commits) {
            const h = new Date(c.timestamp).getHours();
            parts[h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 21 ? 2 : 3].count += 1;
        }
        return parts;
    }, [commits]);
    const topPart = dayParts.some((p) => p.count) ? dayParts.reduce((a, b) => (b.count > a.count ? b : a)) : null;

    const active30 = last30.filter(Boolean).length;
    const bestDay = weekdays.some(Boolean) ? weekdays.indexOf(Math.max(...weekdays)) : -1;
    const dayCommits = selectedDate ? commits.filter((c) => localDayKey(c.timestamp, tz) === selectedDate) : [];

    return (
        <div className="space-y-5 animate-fade-in">
            <button onClick={onBack} className="group flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">
                <ArrowLeft size={13} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" /> All habits
            </button>

            <section className="card relative overflow-hidden border-t-[6px]" style={{ borderTopColor: habit.color }}>
                <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" aria-hidden />
                <div className="relative p-5 sm:p-6 space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs text-[rgb(var(--ink-muted))] flex items-center gap-1.5">
                                <GitBranch size={12} style={{ color: habit.color }} /> branch · since {format(new Date(habit.createdAt), "d MMM yyyy")}
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 break-words">{habit.habitName}</h1>
                        </div>
                        <Menu
                            trigger={
                                <button aria-label="Habit options" className="w-9 h-9 flex-shrink-0 flex items-center justify-center border-2 border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] hover:bg-[rgb(var(--paper-alt))]">
                                    <MoreHorizontal size={16} />
                                </button>
                            }
                            items={[
                                { label: "Rename", icon: <PenLine size={13} />, onSelect: onRename },
                                { label: "Clear commits", icon: <Eraser size={13} />, onSelect: onClear, danger: true },
                                { label: "Delete habit", icon: <Trash2 size={13} />, onSelect: onDelete, danger: true },
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Stat icon={<Flame size={14} className={habit.currentStreak ? "text-orange-500" : ""} />} value={habit.currentStreak} label="current streak" />
                        <Stat icon={<Trophy size={14} />} value={habit.longestStreak} label="longest streak" />
                        <Stat icon={<GitCommitHorizontal size={14} />} value={habit.commitCount} label="commits" />
                        <Stat icon={<Target size={14} />} value={`${Math.round((active30 / 30) * 100)}%`} label="last 30 days" />
                    </div>

                    <QuickCommit habits={habits} defaultHabitId={habit.habitId} lockHabit onCommitted={onCommitted} />
                </div>
            </section>

            <Card className="min-w-0">
                <SectionTitle title="contributions" meta="Tap a day to see its commits" />
                {loading ? <div className="h-32 shimmer-bg" /> : (
                    <Heatmap counts={counts} slot={habit.slot} selectedDate={selectedDate} onDayClick={(d) => setSelectedDate((s) => (s === d ? null : d))} />
                )}
                {selectedDate && (
                    <DayCommits
                        date={selectedDate} commits={dayCommits} loading={false}
                        colorOf={() => habit.color} onClose={() => setSelectedDate(null)} onDelete={onDeleteCommit}
                    />
                )}
            </Card>

            <div className="grid gap-5 md:grid-cols-3">
                <Card>
                    <SectionTitle title="consistency" meta="Active days in the last 30" />
                    <div className="flex items-center gap-4">
                        <ProgressRing value={active30} max={30} size={76} stroke={9} color={habit.color} label={`${active30} of 30 days`}>
                            <span className="font-mono text-base font-black">{active30}</span>
                        </ProgressRing>
                        <div className="grid grid-cols-10 gap-[3px] flex-1">
                            {last30.map((v, i) => (
                                <span key={i} className="aspect-square rounded-[2px]" style={{ background: v ? habit.color : "rgb(var(--paper-alt))" }} title={v ? `${v} commit${v === 1 ? "" : "s"}` : "No commits"} />
                            ))}
                        </div>
                    </div>
                </Card>

                <Card>
                    <SectionTitle title="weekday-rhythm" meta={bestDay >= 0 ? <>Strongest on <b>{WEEKDAY_NAMES[bestDay]}</b></> : "No commits yet"} />
                    <div className="flex items-end gap-2 h-[76px]">
                        {weekdays.map((v, i) => {
                            const max = Math.max(1, ...weekdays);
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end" title={`${WEEKDAY_NAMES[i]}: ${v} active day${v === 1 ? "" : "s"}`}>
                                    <span
                                        className="w-full max-w-[24px] rounded-t-[4px]"
                                        style={{ height: v ? `${Math.max(8, (v / max) * 100)}%` : 3, background: v ? habit.color : "rgb(var(--ink) / 0.12)", opacity: i === bestDay || !v ? 1 : 0.55 }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 border-t-2 border-[rgb(var(--border))] pt-1">
                        {WEEKDAYS.map((d, i) => (
                            <span key={d} className={`flex-1 text-center text-[10px] font-bold ${i === bestDay ? "text-[rgb(var(--ink))]" : "text-[rgb(var(--ink-muted))]"}`}>{d[0]}</span>
                        ))}
                    </div>
                </Card>

                <Card>
                    <SectionTitle title="time-of-day" meta={topPart ? <>Usually in the <b>{topPart.label.toLowerCase()}</b></> : "No commits yet"} />
                    <ul className="space-y-2">
                        {dayParts.map((part) => {
                            const Icon = part.icon;
                            const pct = commits.length ? Math.round((part.count / commits.length) * 100) : 0;
                            return (
                                <li key={part.label} className="flex items-center gap-2 text-xs" title={`${part.count} commit${part.count === 1 ? "" : "s"}`}>
                                    <Icon size={13} className="text-[rgb(var(--ink-muted))] flex-shrink-0" />
                                    <span className="w-16 font-bold">{part.label}</span>
                                    <span className="flex-1 h-2 rounded-full bg-[rgb(var(--paper-alt))] overflow-hidden">
                                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: habit.color, opacity: part === topPart ? 1 : 0.55 }} />
                                    </span>
                                    <span className="w-8 text-right font-mono text-[rgb(var(--ink-muted))]">{pct}%</span>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            </div>

            <Card>
                <SectionTitle prefix="$ " title={`git log ${habit.habitName.includes(" ") ? `"${habit.habitName}"` : habit.habitName}`} meta={`${commits.length} commit${commits.length === 1 ? "" : "s"}`} />
                <ActivityGraph
                    commits={commits.slice(0, shown)}
                    colorOf={() => habit.color}
                    habitOrder={[habit.habitName]}
                    onDelete={onDeleteCommit}
                    loading={loading}
                    single
                    hasMore={commits.length > shown}
                    onLoadMore={() => setShown((s) => s + PAGE)}
                />
            </Card>
        </div>
    );
}

const WEEKDAY_NAMES = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
    return (
        <div className="px-3 py-2.5 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))]">
            <div className="flex items-center gap-1.5 text-[rgb(var(--ink-muted))]">{icon}<span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
            <p className="font-mono text-2xl font-black leading-none mt-1.5 tabular-nums">{value}</p>
        </div>
    );
}
