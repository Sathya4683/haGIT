"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, BookOpen, Check, GitBranch, GitCommitHorizontal, Terminal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

const DISMISS_KEY = "hagit_onboarding_dismissed";

interface Props {
    habitCount: number;
    commitCount: number;
    onCreateHabit: () => void;
    onFirstCommit: () => void;
}

/** First-run checklist, shown until the basics are done or it is dismissed. */
export function GettingStarted({ habitCount, commitCount, onCreateHabit, onFirstCommit }: Props) {
    const [dismissed, setDismissed] = useState(true);
    const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
    useEffect(() => {
        try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
    }, []);

    if (dismissed || (habitCount > 0 && commitCount > 0)) return null;

    const steps = [
        { label: "Create a habit", hint: "git checkout -b", icon: GitBranch, done: habitCount > 0, onClick: onCreateHabit },
        { label: "Make your first commit", hint: "git commit -m", icon: GitCommitHorizontal, done: commitCount > 0, onClick: onFirstCommit },
        { label: "Connect the CLI or extension", hint: "hagit login", icon: Terminal, done: false, onClick: () => setSettingsOpen(true, "account") },
        { label: "Turn on nightly reminders", hint: "ntfy", icon: BellRing, done: false, onClick: () => setSettingsOpen(true, "reminders") },
    ];
    const done = steps.filter((s) => s.done).length;

    const dismiss = () => {
        setDismissed(true);
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage unavailable */ }
    };

    return (
        <section className="card p-4 sm:p-5 relative animate-fade-in">
            <button onClick={dismiss} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]" aria-label="Dismiss getting started">
                <X size={14} />
            </button>
            <div className="flex items-center gap-3 pr-8">
                <h2 className="font-black text-lg">git init your habits</h2>
                <span className="font-mono text-xs text-[rgb(var(--ink-muted))]">{done}/{steps.length}</span>
            </div>
            <div className="h-1.5 mt-2 mb-4 bg-[rgb(var(--paper-alt))] rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-700" style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
            <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {steps.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <li key={s.label}>
                            <button
                                onClick={s.onClick}
                                disabled={s.done}
                                className={cn(
                                    "w-full h-full text-left flex flex-col gap-2 p-3 border-2 transition-colors",
                                    s.done ? "border-[rgb(var(--border))]/40 bg-[rgb(var(--paper-alt))]" : "border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] lift",
                                )}
                            >
                                <span className={cn("w-8 h-8 flex items-center justify-center border-2", s.done ? "bg-brand-500 border-ink text-white" : "border-[rgb(var(--border))]")}>
                                    {s.done ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
                                </span>
                                <span className={cn("text-sm font-bold leading-snug", s.done && "line-through text-[rgb(var(--ink-muted))]")}>
                                    <span className="font-mono text-[rgb(var(--ink-muted))] mr-1">{i + 1}.</span>{s.label}
                                </span>
                                <span className="font-mono text-[10px] text-[rgb(var(--ink-muted))]">{s.hint}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>
            <Link href="/kb" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">
                <BookOpen size={13} /> New to habit building? Skim the library
            </Link>
        </section>
    );
}
