"use client";
import { useState } from "react";
import { commitsApi } from "@/lib/api";
import type { Habit } from "@hagit/types";
import { X } from "lucide-react";
import { toast } from "sonner";

interface Props { habits: Habit[]; onClose: () => void; onSuccess: () => void; defaultHabitName?: string; }

export function PushCommitModal({ habits, onClose, onSuccess, defaultHabitName }: Props) {
    const [habitName, setHabitName] = useState(defaultHabitName || habits[0]?.name || "");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!habitName || !message.trim()) return;
        setLoading(true);
        try {
            await commitsApi.push(habitName, message.trim());
            toast.success("Commit pushed.");
            onSuccess(); onClose();
        } catch { toast.error("Failed to push commit."); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[rgb(var(--paper))] border-2 border-[rgb(var(--border))] shadow-brutal-lg dark:shadow-brutal-dark animate-bounce-in p-6">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <div className="h-1 w-8 bg-brand-500 mb-3" />
                        <h2 className="text-lg font-black">Push a commit</h2>
                        <p className="text-sm text-[rgb(var(--ink-muted))] mt-0.5">Log your progress</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors">
                        <X size={13} strokeWidth={2.5} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">Habit</label>
                        <select
                            value={habitName}
                            onChange={(e) => setHabitName(e.target.value)}
                            className="input-brutal w-full px-4 py-2.5 text-sm bg-[rgb(var(--paper))] appearance-none"
                            required
                        >
                            {habits.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">Commit message</label>
                        <textarea
                            autoFocus value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe what you did..."
                            rows={3}
                            className="input-brutal w-full px-4 py-3 text-sm resize-none"
                            required
                        />
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 font-bold text-sm border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !message.trim() || !habitName}
                            className="btn-press flex-1 py-2.5 font-bold text-sm bg-brand-500 hover:bg-brand-600 text-white border-2 border-ink shadow-brutal transition-all disabled:opacity-50">
                            {loading ? (
                                <span className="flex items-center justify-center gap-1.5">
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Pushing
                                </span>
                            ) : "Push commit →"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
