"use client";
import { useState } from "react";
import { habitsApi } from "@/lib/api";
import type { Habit } from "@hagit/types";
import { X } from "lucide-react";

interface Props { onClose: () => void; onCreated: (habit: Habit) => void; }

export function NewHabitModal({ onClose, onCreated }: Props) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true); setError("");
        try {
            const habit = await habitsApi.create(name.trim());
            onCreated({ ...habit, commitCount: 0 });
        } catch {
            setError("Failed to create habit.");
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[rgb(var(--paper))] border-2 border-[rgb(var(--border))] shadow-brutal-lg dark:shadow-brutal-dark animate-bounce-in p-6">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <div className="h-1 w-8 bg-brand-500 mb-3" />
                        <h2 className="text-lg font-black">New habit</h2>
                        <p className="text-sm text-[rgb(var(--ink-muted))] mt-0.5">What will you commit to?</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors">
                        <X size={13} strokeWidth={2.5} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        autoFocus type="text" value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Read 30 minutes..."
                        className="input-brutal w-full px-4 py-3 text-sm"
                    />
                    {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 font-bold text-sm border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !name.trim()}
                            className="btn-press flex-1 py-2.5 font-bold text-sm bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink shadow-brutal transition-all disabled:opacity-50">
                            {loading ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating
                                </span>
                            ) : "Create habit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
