import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useHabitsStore } from "@/stores/habitsStore";
import { useCommitsStore } from "@/stores/commitsStore";
import { Header } from "@/components/layout/Header";
import { CommitView } from "@/components/views/CommitView";
import { HabitsView } from "@/components/views/HabitsView";
import { RecentView } from "@/components/views/RecentView";
import { SettingsView } from "@/components/views/SettingsView";
import { ToastProvider } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import type { View } from "@/types";

export default function App() {
    const { user, isLoading, hydrate } = useAuthStore();
    const { habits, selectedHabit, fetch: fetchHabits, select } = useHabitsStore();
    const { fetch: fetchCommits } = useCommitsStore();
    const [view, setView] = useState<View>("commit");

    // Boot: hydrate auth from chrome.storage
    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // Once authenticated, load initial data
    useEffect(() => {
        if (user) {
            fetchHabits();
        }
    }, [user]);

    // When switching to Recent, load commits
    useEffect(() => {
        if (view === "recent" && user) {
            fetchCommits();
        }
    }, [view, user]);

    // ── Loading screen ────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[rgb(var(--paper))]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 bg-brand-500 border-2 border-[rgb(var(--border))] flex items-center justify-center shadow-brutal-sm">
                        <span className="text-white font-black text-xs font-mono">hG</span>
                    </div>
                    <Spinner />
                </div>
            </div>
        );
    }

    // ── Not authenticated ────────────────────────────────────────────────────
    if (!user) {
        return (
            <div className="w-full h-full flex flex-col bg-[rgb(var(--paper))]">
                {/* Minimal header for login state */}
                <div className="flex-shrink-0 border-b-2 border-[rgb(var(--border))] px-4 h-11 flex items-center gap-2 bg-[rgb(var(--paper))]">
                    <div className="w-6 h-6 bg-brand-500 border-2 border-[rgb(var(--border))] flex items-center justify-center">
                        <span className="text-white font-black text-[10px] font-mono">hG</span>
                    </div>
                    <span className="font-black text-sm tracking-tight">haGIT</span>
                    <span className="ml-2 text-[10px] font-bold text-[rgb(var(--ink-muted))] border border-[rgb(var(--paper-alt))] px-1.5 py-px">Not connected</span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <SettingsView />
                </div>
                <ToastProvider />
            </div>
        );
    }

    // ── Authenticated app ─────────────────────────────────────────────────────
    return (
        <div className="w-full h-full flex flex-col bg-[rgb(var(--paper))]">
            <Header
                habits={habits}
                selectedHabit={selectedHabit}
                onSelectHabit={select}
                activeView={view}
                onChangeView={setView}
                email={user.email}
            />

            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {view === "commit" && <CommitView />}
                {view === "habits" && <HabitsView />}
                {view === "recent" && <RecentView />}
                {view === "settings" && <SettingsView />}
            </div>

            <ToastProvider />
        </div>
    );
}
