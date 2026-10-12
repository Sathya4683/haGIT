"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";

/** Opens the coach in place with a prefilled question; visitors are sent to sign in. */
export function AskCoachButton({ question }: { question: string }) {
    const user = useAuthStore((s) => s.user);
    const openCoachWith = useUiStore((s) => s.openCoachWith);
    const className = "btn-press flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal";
    if (!user) {
        return <Link href="/auth/login" className={className}><Bot size={15} strokeWidth={2.5} /> Sign in to ask</Link>;
    }
    return (
        <button onClick={() => openCoachWith(question)} className={className}>
            <Bot size={15} strokeWidth={2.5} /> Ask the coach
        </button>
    );
}
