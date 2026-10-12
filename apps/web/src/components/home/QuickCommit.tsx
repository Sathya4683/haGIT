"use client";

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { toast } from "sonner";
import { commitsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { centreOf, useCelebrate } from "@/components/ui/Celebrate";
import type { HabitView } from "./types";

interface Props {
    habits: HabitView[];
    /** Preselected habit (habit page) or the first habit still open today. */
    defaultHabitId?: number;
    lockHabit?: boolean;
    onCommitted: (habit: HabitView) => void;
}

/** Terminal-style commit bar: `$ hagit commit -m "…" on <habit>`. */
export function QuickCommit({ habits, defaultHabitId, lockHabit, onCommitted }: Props) {
    const firstOpen = habits.find((h) => !h.committedToday) ?? habits[0];
    const [habitId, setHabitId] = useState<number | undefined>(defaultHabitId ?? firstOpen?.habitId);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const celebrate = useCelebrate();

    useEffect(() => {
        if (defaultHabitId) setHabitId(defaultHabitId);
        else if (!habits.some((h) => h.habitId === habitId)) setHabitId(firstOpen?.habitId);
    }, [defaultHabitId, habits, habitId, firstOpen]);

    const habit = habits.find((h) => h.habitId === habitId);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!habit || !message.trim() || saving) return;
        setSaving(true);
        try {
            await commitsApi.push(habit.habitName, message.trim());
            celebrate(centreOf(formRef.current), { colors: [habit.color, "rgb(var(--brand-500))", "rgb(var(--series-4))"] });
            toast.success(`Committed to ${habit.habitName}`);
            setMessage("");
            onCommitted(habit);
        } catch (error) {
            toast.error(apiErrorMessage(error, "Couldn't push that commit."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form ref={formRef} onSubmit={submit} className="bg-ink text-white border-2 border-ink shadow-brutal dark:shadow-brutal-dark" aria-label="Quick commit">
            <div className="flex items-center gap-2 px-3 pt-2.5 sm:pb-2.5">
                <span className="font-mono text-xs text-brand-400 whitespace-nowrap select-none">
                    $ hagit commit -m
                </span>
                <input
                    id="quick-commit-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    disabled={!habit}
                    placeholder={habit ? '"what did you do?"' : "create a habit first"}
                    aria-label="Commit message"
                    className="flex-1 min-w-0 bg-transparent font-mono text-sm text-white placeholder:text-white/35 outline-none py-1"
                />
                <div className="hidden sm:flex items-center gap-2">
                    <HabitPicker habits={habits} value={habitId} onChange={setHabitId} locked={lockHabit} />
                    <SubmitButton disabled={!habit || !message.trim() || saving} saving={saving} />
                </div>
            </div>
            <div className="flex sm:hidden items-center gap-2 px-3 pb-2.5 pt-1.5">
                <HabitPicker habits={habits} value={habitId} onChange={setHabitId} locked={lockHabit} />
                <div className="flex-1" />
                <SubmitButton disabled={!habit || !message.trim() || saving} saving={saving} />
            </div>
        </form>
    );
}

function HabitPicker({ habits, value, onChange, locked }: { habits: HabitView[]; value?: number; onChange: (id: number) => void; locked?: boolean }) {
    const current = habits.find((h) => h.habitId === value);
    return (
        <label className="relative flex items-center gap-1.5 h-8 pl-2 pr-1 border border-white/25 font-mono text-xs text-white/80 hover:border-white/50 focus-within:border-white">
            <span className="text-white/45">on</span>
            <span className="w-2 h-2 flex-shrink-0" style={{ background: current?.color ?? "transparent" }} />
            <select
                value={value ?? ""}
                disabled={locked || habits.length === 0}
                onChange={(e) => onChange(Number(e.target.value))}
                aria-label="Habit"
                className="bg-transparent outline-none max-w-[9rem] truncate pr-1 disabled:opacity-100 [&>option]:text-black"
            >
                {habits.map((h) => (
                    <option key={h.habitId} value={h.habitId}>{h.habitName}{h.committedToday ? " ✓" : ""}</option>
                ))}
            </select>
        </label>
    );
}

function SubmitButton({ disabled, saving }: { disabled: boolean; saving: boolean }) {
    return (
        <button
            type="submit"
            disabled={disabled}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
        >
            {saving ? "Pushing…" : "Commit"} <CornerDownLeft size={12} strokeWidth={2.5} />
        </button>
    );
}
