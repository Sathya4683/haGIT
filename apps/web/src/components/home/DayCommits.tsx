"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import type { Commit } from "@hagit/types";
import { CommitRow } from "./ActivityGraph";

interface Props {
    date: string;
    commits: Commit[];
    loading: boolean;
    colorOf: (habitName: string) => string;
    onClose: () => void;
    onDelete: (commit: Commit) => void;
}

export function DayCommits({ date, commits, loading, colorOf, onClose, onDelete }: Props) {
    return (
        <div className="mt-4 border-2 border-[rgb(var(--border))] bg-[rgb(var(--paper))] animate-slide-up">
            <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-[rgb(var(--border))]">
                <p className="text-sm font-black">
                    {format(new Date(`${date}T00:00:00`), "EEEE, MMMM d")}
                    <span className="ml-2 font-mono text-xs font-normal text-[rgb(var(--ink-muted))]">
                        {loading ? "…" : `${commits.length} commit${commits.length === 1 ? "" : "s"}`}
                    </span>
                </p>
                <button onClick={onClose} aria-label="Close day" className="w-7 h-7 flex items-center justify-center hover:bg-[rgb(var(--paper-alt))]">
                    <X size={14} />
                </button>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {loading ? (
                    <div className="p-4 space-y-2">{[0, 1].map((i) => <div key={i} className="h-9 shimmer-bg" />)}</div>
                ) : commits.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[rgb(var(--ink-muted))]">Nothing committed on this day.</p>
                ) : (
                    commits.map((c) => <CommitRow key={c.id} commit={c} color={colorOf(c.habitName)} onDelete={() => onDelete(c)} compact />)
                )}
            </div>
        </div>
    );
}
