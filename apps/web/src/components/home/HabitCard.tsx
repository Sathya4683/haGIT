"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Flame, MoreHorizontal, PenLine, Plus, Trash2, Eraser, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { commitsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import { MiniBars } from "@/components/ui/MiniBars";
import { Menu } from "@/components/ui/Menu";
import { centreOf, useCelebrate } from "@/components/ui/Celebrate";
import type { HabitView } from "./types";

interface Props {
    habit: HabitView;
    onOpen: () => void;
    onChanged: (opts?: { completedDay?: boolean }) => void;
    onRename: () => void;
    onClear: () => void;
    onDelete: () => void;
    /** True when this check-in would complete every habit for today. */
    isLastOpen: boolean;
}

export function HabitCard({ habit, onOpen, onChanged, onRename, onClear, onDelete, isLastOpen }: Props) {
    const [saving, setSaving] = useState(false);
    const checkRef = useRef<HTMLButtonElement>(null);
    const celebrate = useCelebrate();
    const done = habit.committedToday;
    const week = habit.recent.slice(-7).reduce((a, b) => a + b, 0);

    const checkIn = async () => {
        if (done || saving) return;
        setSaving(true);
        try {
            const res = await commitsApi.push(habit.habitName, "Checked in ✓");
            const id = res.commits[0]?.id;
            celebrate(centreOf(checkRef.current), { colors: [habit.color, "rgb(var(--brand-500))", "rgb(var(--series-4))"], big: isLastOpen });
            toast.success(isLastOpen ? "Perfect day! Every habit committed." : `${habit.habitName} committed`, {
                description: `${habit.currentStreak + 1}-day streak`,
                action: id ? { label: "Undo", onClick: () => commitsApi.delete(String(id)).then(() => onChanged()).catch(() => undefined) } : undefined,
            });
            onChanged({ completedDay: isLastOpen });
        } catch (error) {
            toast.error(apiErrorMessage(error, "Couldn't check in."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <article
            className="card lift relative flex flex-col gap-3 p-4 border-t-[6px]"
            style={{ borderTopColor: habit.color }}
        >
            <header className="flex items-center gap-2 min-w-0">
                <button onClick={onOpen} className="min-w-0 text-left group">
                    <h3 className="font-black text-[15px] leading-tight truncate group-hover:underline decoration-2 underline-offset-2" style={{ textDecorationColor: habit.color }}>
                        {habit.habitName}
                    </h3>
                    <p className="text-[11px] text-[rgb(var(--ink-muted))] mt-0.5 font-mono">
                        {habit.lastCommitAt ? `last ${formatDistanceToNow(new Date(habit.lastCommitAt), { addSuffix: true })}` : "no commits yet"}
                    </p>
                </button>
                <div className="ml-auto">
                    <Menu
                        trigger={
                            <button className="w-7 h-7 flex items-center justify-center text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] hover:bg-[rgb(var(--paper-alt))]" aria-label={`${habit.habitName} options`}>
                                <MoreHorizontal size={16} />
                            </button>
                        }
                        items={[
                            { label: "View details", icon: <BarChart3 size={13} />, onSelect: onOpen },
                            { label: "Rename", icon: <PenLine size={13} />, onSelect: onRename },
                            { label: "Clear commits", icon: <Eraser size={13} />, onSelect: onClear, danger: true },
                            { label: "Delete habit", icon: <Trash2 size={13} />, onSelect: onDelete, danger: true },
                        ]}
                    />
                </div>
            </header>

            <div className="flex items-end gap-3">
                <div className="flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Flame size={20} className={cn(habit.currentStreak > 0 ? "text-orange-500" : "text-[rgb(var(--ink-muted))]", habit.currentStreak >= 3 && "animate-[wiggle_1.6s_ease-in-out_infinite]")} />
                        <span className="font-mono text-3xl font-black leading-none tabular-nums">{habit.currentStreak}</span>
                        <span className="text-xs font-bold text-[rgb(var(--ink-muted))] self-end mb-0.5">day{habit.currentStreak === 1 ? "" : "s"}</span>
                    </div>
                    <p className="text-[11px] text-[rgb(var(--ink-muted))] mt-1.5 whitespace-nowrap">
                        best <b className="font-mono text-[rgb(var(--ink))]">{habit.longestStreak}</b> · <b className="font-mono text-[rgb(var(--ink))]">{week}</b> this week
                    </p>
                </div>
                <MiniBars values={habit.recent} color={habit.color} height={38} className="flex-1 min-w-0 justify-end" />
                <button
                    ref={checkRef}
                    onClick={checkIn}
                    disabled={saving}
                    aria-pressed={done}
                    aria-label={done ? `${habit.habitName} committed today` : `Check in ${habit.habitName} for today`}
                    title={done ? "Committed today" : "Check in for today"}
                    className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center border-2 transition-all",
                        done
                            ? "border-ink text-white shadow-brutal-sm cursor-default"
                            : "border-dashed border-[rgb(var(--border))] text-[rgb(var(--ink-muted))] hover:border-solid hover:text-[rgb(var(--ink))] hover:shadow-brutal-sm active:translate-x-px active:translate-y-px",
                    )}
                    style={done ? { background: habit.color } : undefined}
                >
                    {saving ? (
                        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : done ? (
                        <Check size={26} strokeWidth={3.5} className="animate-[pop_0.35s_ease-out]" />
                    ) : (
                        <Plus size={22} strokeWidth={2.5} />
                    )}
                </button>
            </div>
        </article>
    );
}

export function NewHabitCard({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="group min-h-[132px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[rgb(var(--border))] text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] hover:bg-[rgb(var(--card-bg))] transition-colors p-4"
        >
            <span className="w-10 h-10 flex items-center justify-center border-2 border-dashed border-current group-hover:border-solid group-hover:rotate-90 transition-transform">
                <Plus size={22} strokeWidth={2.5} />
            </span>
            <span className="font-black text-sm">New habit <span className="font-mono font-normal text-[11px] ml-1">git checkout -b</span></span>
        </button>
    );
}
