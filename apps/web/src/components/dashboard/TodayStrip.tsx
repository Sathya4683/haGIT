"use client";

import { useState } from "react";
import { Check, Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { commitsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";
import type { CommitByHabit } from "@/types";

interface Props {
    habits: CommitByHabit[];
    loading?: boolean;
    onCommitted: () => void;
    onCreateHabit: () => void;
}

/** Today's checklist: one chip per habit, one click to commit the ones still open. */
export function TodayStrip({ habits, loading, onCommitted, onCreateHabit }: Props) {
    const [open, setOpen] = useState<number | null>(null);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const done = habits.filter((h) => h.committedToday).length;

    const commit = async (habit: CommitByHabit) => {
        const text = message.trim() || "Done ✓";
        setSaving(true);
        try {
            await commitsApi.push(habit.habitName, text);
            toast.success(`Committed to ${habit.habitName}`);
            setOpen(null);
            setMessage("");
            onCommitted();
        } catch (error) {
            toast.error(apiErrorMessage(error, "Failed to push commit."));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="h-[72px] shimmer-bg border-2 border-[rgb(var(--border))]" />;

    return (
        <section className="card p-4 space-y-3" aria-label="Today">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">Today</p>
                {habits.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[rgb(var(--paper-alt))]" aria-hidden>
                            <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${(done / habits.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-black font-mono tabular-nums">{done}/{habits.length}</span>
                    </div>
                )}
            </div>

            {habits.length === 0 ? (
                <button onClick={onCreateHabit} className="flex items-center gap-1.5 text-sm font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">
                    <Plus size={14} /> Create your first habit
                </button>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {habits.map((h) =>
                        open === h.habitId ? (
                            <form
                                key={h.habitId}
                                onSubmit={(e) => { e.preventDefault(); commit(h); }}
                                className="flex items-stretch border-2 border-[rgb(var(--border))] animate-fade-in"
                            >
                                <span className="px-2.5 flex items-center text-xs font-bold bg-[rgb(var(--paper-alt))] border-r-2 border-[rgb(var(--border))]">{h.habitName}</span>
                                <input
                                    autoFocus value={message} onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Escape" && setOpen(null)}
                                    placeholder="Done ✓" maxLength={500} aria-label={`Commit message for ${h.habitName}`}
                                    className="w-40 sm:w-56 px-2.5 py-1.5 text-xs bg-[rgb(var(--paper))] outline-none"
                                />
                                <button type="submit" disabled={saving} className="px-3 text-xs font-bold bg-brand-500 text-white disabled:opacity-60">
                                    {saving ? "…" : "Commit"}
                                </button>
                            </form>
                        ) : (
                            <button
                                key={h.habitId}
                                onClick={() => { if (!h.committedToday) { setOpen(h.habitId); setMessage(""); } }}
                                aria-pressed={h.committedToday}
                                title={h.committedToday ? "Committed today" : "Commit now"}
                                className={cn(
                                    "btn-press-sm flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 transition-colors",
                                    h.committedToday
                                        ? "bg-brand-500 text-white border-ink cursor-default"
                                        : "border-dashed border-[rgb(var(--border))] hover:border-solid hover:bg-[rgb(var(--paper-alt))]",
                                )}
                            >
                                {h.committedToday ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={2.5} />}
                                {h.habitName}
                                {h.currentStreak > 1 && (
                                    <span className={cn("flex items-center gap-0.5 font-mono", h.committedToday ? "text-white/80" : "text-[rgb(var(--ink-muted))]")}>
                                        <Flame size={11} />{h.currentStreak}
                                    </span>
                                )}
                            </button>
                        ),
                    )}
                </div>
            )}
        </section>
    );
}
