"use client";

import { useEffect, useState } from "react";
import { GitBranch, X } from "lucide-react";
import { toast } from "sonner";
import type { Habit } from "@hagit/types";
import { habitsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

const IDEAS = ["Read 10 pages", "Walk 20 min", "Drink water", "Meditate", "Journal", "Stretch", "Practice guitar", "No phone in bed"];

interface Props {
    /** Rename this habit; omit to create a new one. */
    habit?: { id: number; name: string };
    onClose: () => void;
    onSaved: (habit: Habit) => void;
}

/** Create or rename a habit ("branch"). */
export function HabitNameModal({ habit, onClose, onSaved }: Props) {
    const [name, setName] = useState(habit?.name ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const renaming = Boolean(habit);
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || "…";

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = name.trim();
        if (!value || saving || value === habit?.name) return;
        setSaving(true);
        setError("");
        try {
            const saved = habit ? await habitsApi.rename(habit.id, value) : await habitsApi.create(value);
            onSaved(saved);
        } catch (err) {
            const message = apiErrorMessage(err, renaming ? "Couldn't rename the habit." : "Couldn't create the habit.");
            setError(message);
            if ((err as { response?: { status?: number } })?.response?.status === 429) toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="habit-modal-title"
                className="relative w-full sm:max-w-md bg-[rgb(var(--paper))] border-2 border-[rgb(var(--border))] shadow-brutal-lg dark:shadow-brutal-dark animate-slide-up sm:animate-bounce-in pb-safe">
                <div className="flex items-center gap-2 px-5 h-11 bg-ink text-white">
                    <GitBranch size={14} className="text-brand-400" />
                    <p id="habit-modal-title" className="font-mono text-xs flex-1 truncate">
                        {renaming ? <>git branch -m {habit!.name.toLowerCase().replace(/\s+/g, "-")} <span className="text-brand-400">{slug}</span></> : <>git checkout -b <span className="text-brand-400">{slug}</span></>}
                    </p>
                    <button onClick={onClose} aria-label="Close" className="w-7 h-7 flex items-center justify-center hover:bg-white/10">
                        <X size={14} />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <div>
                        <h2 className="text-xl font-black">{renaming ? "Rename habit" : "New habit"}</h2>
                        <p className="text-sm text-[rgb(var(--ink-muted))] mt-0.5">
                            {renaming ? "Commits and streaks stay with it." : "Small and specific works best. You can always rename it."}
                        </p>
                    </div>
                    <input
                        autoFocus
                        value={name}
                        maxLength={50}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Read 10 pages"
                        aria-label="Habit name"
                        className="input-brutal w-full px-4 py-3 text-base sm:text-sm"
                    />
                    {!renaming && (
                        <div className="flex flex-wrap gap-1.5">
                            {IDEAS.map((idea) => (
                                <button
                                    key={idea} type="button" onClick={() => setName(idea)}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-bold border-2 transition-colors",
                                        name === idea ? "border-[rgb(var(--border))] bg-brand-100 dark:bg-brand-900" : "border-dashed border-[rgb(var(--border))]/50 text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] hover:border-solid",
                                    )}
                                >
                                    {idea}
                                </button>
                            ))}
                        </div>
                    )}
                    {error && <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 font-bold text-sm border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim() || name.trim() === habit?.name}
                            className="btn-press flex-1 py-2.5 font-bold text-sm bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink shadow-brutal disabled:opacity-50"
                        >
                            {saving ? "Saving…" : renaming ? "Rename" : "Create habit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
