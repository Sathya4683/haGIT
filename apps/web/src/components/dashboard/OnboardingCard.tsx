"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "hagit_onboarding_dismissed";

interface Props {
    habitCount: number;
    commitCount: number;
    onCreateHabit: () => void;
    onPushCommit: () => void;
    onOpenSettings: () => void;
}

/** First-run checklist, shown until the basics are done or it is dismissed. */
export function OnboardingCard({ habitCount, commitCount, onCreateHabit, onPushCommit, onOpenSettings }: Props) {
    const [dismissed, setDismissed] = useState(true);
    useEffect(() => {
        try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
    }, []);

    if (dismissed || (habitCount > 0 && commitCount > 0)) return null;

    const steps = [
        { label: "Create your first habit", done: habitCount > 0, action: onCreateHabit },
        { label: "Push your first commit", done: commitCount > 0, action: onPushCommit },
        { label: "Connect the CLI or browser extension", done: false, action: onOpenSettings },
        { label: "Turn on nightly reminders", done: false, action: onOpenSettings },
    ];

    const dismiss = () => {
        setDismissed(true);
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    };

    return (
        <section className="card p-5 relative">
            <button onClick={dismiss} className="absolute top-3 right-3 text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]" aria-label="Dismiss">
                <X size={14} />
            </button>
            <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">Getting started</p>
            <h2 className="text-lg font-black mt-1">git init your habits</h2>
            <ol className="mt-3 space-y-2">
                {steps.map((s, i) => (
                    <li key={s.label}>
                        <button onClick={s.action} disabled={s.done} className="flex items-center gap-2.5 text-sm font-bold disabled:cursor-default group">
                            <span className={cn("w-5 h-5 flex items-center justify-center border-2 text-[10px] font-black", s.done ? "bg-brand-500 border-ink text-white" : "border-[rgb(var(--border))]")}>
                                {s.done ? <Check size={11} strokeWidth={3} /> : i + 1}
                            </span>
                            <span className={cn(s.done ? "line-through text-[rgb(var(--ink-muted))]" : "group-hover:underline decoration-brand-500 decoration-2 underline-offset-2")}>{s.label}</span>
                        </button>
                    </li>
                ))}
                <li className="flex items-center gap-2.5 text-sm font-bold">
                    <span className="w-5 h-5 flex items-center justify-center border-2 border-[rgb(var(--border))] text-[10px] font-black">{steps.length + 1}</span>
                    <Link href="/kb" className="hover:underline decoration-brand-500 decoration-2 underline-offset-2">Skim the habit library</Link>
                </li>
            </ol>
        </section>
    );
}
