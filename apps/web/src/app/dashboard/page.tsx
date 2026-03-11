"use client";

import { useState, useEffect, useCallback } from "react";
import { habitsApi, commitsApi } from "@/lib/api";
import type { Habit, HabitDetail, Commit } from "@hagit/types";
import type { AggregatedCommit, CommitByHabit } from "@/types";
import { TopNav } from "@/components/nav/TopNav";
import { SettingsDrawer } from "@/components/nav/SettingsDrawer";
import { ContributionHeatmap } from "@/components/dashboard/ContributionHeatmap";
import { CommitList } from "@/components/dashboard/CommitList";
import { HabitSummaryCards } from "@/components/dashboard/HabitSummaryCards";
import { PushCommitModal } from "@/components/dashboard/PushCommitModal";
import { DayCommitsPanel } from "@/components/dashboard/DayCommitsPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NewHabitModal } from "@/components/sidebar/NewHabitModal";
import { ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DashboardPage() {
    // ── Shared ───────────────────────────────────────────────────────────────
    const [habits, setHabits] = useState<Habit[]>([]);
    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);

    // ── Overview data ─────────────────────────────────────────────────────────
    const [commitsByHabit, setCommitsByHabit] = useState<CommitByHabit[]>([]);
    const [aggregated, setAggregated] = useState<AggregatedCommit[]>([]);
    const [recentCommits, setRecentCommits] = useState<Commit[]>([]);
    const [loadingOverview, setLoadingOverview] = useState(true);

    // ── Habit detail ──────────────────────────────────────────────────────────
    const [habitDetail, setHabitDetail] = useState<HabitDetail | null>(null);
    const [habitAggregated, setHabitAggregated] = useState<AggregatedCommit[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ── Day panel ─────────────────────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dayCommits, setDayCommits] = useState<Commit[]>([]);
    const [loadingDayCommits, setLoadingDayCommits] = useState(false);

    // ── UI ────────────────────────────────────────────────────────────────────
    const [showPush, setShowPush] = useState(false);
    const [showNewHabit, setShowNewHabit] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showClearCommits, setShowClearCommits] = useState(false);
    const [clearingCommits, setClearingCommits] = useState(false);
    const [pendingDeleteHabit, setPendingDeleteHabit] = useState<Habit | null>(null);
    const [deletingHabit, setDeletingHabit] = useState(false);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const buildHabitAggregated = useCallback((detail: HabitDetail) => {
        const countMap: Record<string, number> = {};
        detail.commits.forEach((c) => {
            const d = format(new Date(c.timestamp || c.createdAt), "yyyy-MM-dd");
            countMap[d] = (countMap[d] || 0) + 1;
        });
        return Object.entries(countMap).map(([date, count]) => ({ date, count }));
    }, []);

    const loadOverview = useCallback(async () => {
        setLoadingOverview(true);
        try {
            const [byHabit, agg, recent, habitList] = await Promise.all([
                commitsApi.byHabit(),
                commitsApi.aggregated(),
                commitsApi.list({ limit: 25 }),
                habitsApi.list(),
            ]);
            setCommitsByHabit(byHabit);
            setAggregated(agg);
            setRecentCommits(recent);
            setHabits(habitList);
        } finally { setLoadingOverview(false); }
    }, []);

    const loadHabitDetail = useCallback(async (id: number) => {
        setLoadingDetail(true);
        setSelectedDate(null);
        setDayCommits([]);
        try {
            const detail = await habitsApi.get(id);
            setHabitDetail(detail);
            setHabitAggregated(buildHabitAggregated(detail));
        } finally { setLoadingDetail(false); }
    }, [buildHabitAggregated]);

    useEffect(() => { loadOverview(); }, [loadOverview]);

    useEffect(() => {
        if (selectedHabitId === null) {
            setHabitDetail(null); setHabitAggregated([]);
            setSelectedDate(null); setDayCommits([]);
            return;
        }
        loadHabitDetail(selectedHabitId);
    }, [selectedHabitId, loadHabitDetail]);

    // ── Day click ─────────────────────────────────────────────────────────────
    const handleDayClick = useCallback(async (date: string) => {
        if (selectedDate === date) { setSelectedDate(null); setDayCommits([]); return; }
        setSelectedDate(date);
        setLoadingDayCommits(true);
        try {
            const all = await commitsApi.list({ limit: 500 });
            const hn = selectedHabitId !== null ? habits.find((h) => h.id === selectedHabitId)?.name : null;
            setDayCommits(all.filter((c) =>
                format(new Date(c.timestamp), "yyyy-MM-dd") === date &&
                (hn == null ? true : c.habitName === hn)
            ));
        } finally { setLoadingDayCommits(false); }
    }, [selectedDate, selectedHabitId, habits]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const handleCommitDeleted = useCallback((commitId: string) => {
        setRecentCommits((p) => p.filter((c) => c.id !== commitId));
        setDayCommits((p) => p.filter((c) => c.id !== commitId));
        commitsApi.aggregated().then(setAggregated);
        commitsApi.byHabit().then(setCommitsByHabit);
        if (selectedHabitId !== null) {
            habitsApi.get(selectedHabitId).then((d) => {
                setHabitDetail(d); setHabitAggregated(buildHabitAggregated(d));
                habitsApi.list().then(setHabits);
            });
        } else { habitsApi.list().then(setHabits); }
    }, [selectedHabitId, buildHabitAggregated]);

    const handleClearCommits = async () => {
        if (!habitDetail) return;
        setClearingCommits(true);
        try {
            await commitsApi.deleteByHabit(habitDetail.id);
            toast.success("Commits cleared.");
            setShowClearCommits(false);
            setSelectedDate(null); setDayCommits([]);
            await loadHabitDetail(habitDetail.id);
            commitsApi.aggregated().then(setAggregated);
            commitsApi.byHabit().then(setCommitsByHabit);
            habitsApi.list().then(setHabits);
        } catch { toast.error("Failed to clear commits."); }
        finally { setClearingCommits(false); }
    };

    const handleConfirmDeleteHabit = async () => {
        if (!pendingDeleteHabit) return;
        setDeletingHabit(true);
        try {
            await habitsApi.delete(pendingDeleteHabit.id);
            if (selectedHabitId === pendingDeleteHabit.id) setSelectedHabitId(null);
            toast.success(`"${pendingDeleteHabit.name}" deleted.`);
            setPendingDeleteHabit(null);
            loadOverview();
        } catch { toast.error("Failed to delete habit."); }
        finally { setDeletingHabit(false); }
    };

    const handlePushSuccess = useCallback(() => {
        loadOverview();
        if (selectedHabitId !== null) loadHabitDetail(selectedHabitId);
    }, [selectedHabitId, loadOverview, loadHabitDetail]);

    const handleNewHabit = (habit: Habit) => {
        setHabits((p) => [...p, habit]);
        setShowNewHabit(false);
        toast.success(`"${habit.name}" created.`);
    };

    const totalCommits = commitsByHabit.reduce((s, c) => s + c.commitCount, 0);
    const weekCommits = (() => {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return recentCommits.filter((c) => new Date(c.timestamp) >= weekAgo).length;
    })();

    return (
        <div className="min-h-screen bg-[rgb(var(--paper))]">
            <TopNav
                habits={habits} selectedHabitId={selectedHabitId}
                onSelectHabit={setSelectedHabitId} onCreateHabit={() => setShowNewHabit(true)}
                onDeleteHabit={setPendingDeleteHabit} onPushCommit={() => setShowPush(true)}
                onOpenSettings={() => setShowSettings(true)} loading={loadingOverview}
            />
            <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />

            {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
            {selectedHabitId === null && (
                <div className="animate-fade-in">

                    {/* Stats bar */}
                    <div className="border-b-2 border-[rgb(var(--border))]">
                        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-wrap gap-x-0 gap-y-0">
                            {loadingOverview ? (
                                <div className="flex gap-8">
                                    {[72, 48, 60].map((w, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <div className="h-7 shimmer-bg" style={{ width: w }} />
                                            <div className="h-3 shimmer-bg w-20" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-wrap divide-x-2 divide-[rgb(var(--border))]">
                                    <StatCard value={totalCommits} label="total commits" />
                                    <StatCard value={habits.length} label={`habit${habits.length !== 1 ? "s" : ""}`} />
                                    <StatCard value={weekCommits} label="this week" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main layout */}
                    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">

                            {/* Left column — heatmap + commits */}
                            <div className="flex-1 min-w-0 space-y-8">
                                {/* Heatmap card */}
                                <div className="card p-5 space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                                        Contribution graph
                                    </p>
                                    {loadingOverview
                                        ? <div className="h-24 shimmer-bg" />
                                        : <ContributionHeatmap data={aggregated} onDayClick={handleDayClick} selectedDate={selectedDate} />
                                    }
                                    {selectedDate && (
                                        <DayCommitsPanel
                                            date={selectedDate} commits={dayCommits} loading={loadingDayCommits}
                                            onClose={() => { setSelectedDate(null); setDayCommits([]); }}
                                            onDeleted={handleCommitDeleted}
                                        />
                                    )}
                                </div>

                                {/* Recent commits */}
                                <div className="card p-5">
                                    <CommitList commits={recentCommits} loading={loadingOverview} onDeleted={handleCommitDeleted} />
                                </div>
                            </div>

                            {/* Right column — habits ranking */}
                            <div className="w-full lg:w-60 xl:w-72 flex-shrink-0 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                                    Habits
                                </p>
                                <HabitSummaryCards data={commitsByHabit} loading={loadingOverview} onSelect={setSelectedHabitId} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HABIT DETAIL ────────────────────────────────────────────────── */}
            {selectedHabitId !== null && (
                <div className="animate-fade-in">

                    {/* Header strip */}
                    <div className="border-b-2 border-[rgb(var(--border))] bg-[rgb(var(--paper-alt))]">
                        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-5">
                            <button
                                onClick={() => setSelectedHabitId(null)}
                                className="flex items-center gap-1.5 text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))] transition-colors mb-4 group"
                            >
                                <ArrowLeft size={12} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                                All habits
                            </button>

                            {loadingDetail ? (
                                <div className="space-y-2">
                                    <div className="h-7 w-48 shimmer-bg" />
                                    <div className="h-4 w-24 shimmer-bg" />
                                </div>
                            ) : habitDetail ? (
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <h1 className="text-2xl font-black tracking-tight">{habitDetail.name}</h1>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="font-mono font-bold text-[rgb(var(--ink-muted))] text-sm">
                                                {habitDetail.commitCount} commit{habitDetail.commitCount !== 1 ? "s" : ""}
                                            </span>
                                            <div className="h-3 w-px bg-[rgb(var(--border))]" />
                                            <div className="h-1 w-1 bg-brand-500" />
                                            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Active</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowClearCommits(true)}
                                        className="btn-press-sm flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                    >
                                        <Trash2 size={11} />
                                        Clear commits
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Heatmap */}
                    <div className="border-b-2 border-[rgb(var(--border))]">
                        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
                            {loadingDetail
                                ? <div className="h-24 shimmer-bg" />
                                : <ContributionHeatmap data={habitAggregated} onDayClick={handleDayClick} selectedDate={selectedDate} />
                            }
                            {selectedDate && (
                                <DayCommitsPanel
                                    date={selectedDate} commits={dayCommits} loading={loadingDayCommits}
                                    onClose={() => { setSelectedDate(null); setDayCommits([]); }}
                                    onDeleted={handleCommitDeleted}
                                />
                            )}
                        </div>
                    </div>

                    {/* Commits */}
                    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 py-8 max-w-2xl">
                        <div className="card p-5">
                            {habitDetail && (
                                <CommitList
                                    commits={habitDetail.commits.map((c) => ({
                                        id: String(c.id), habitName: habitDetail.name,
                                        message: c.message, timestamp: c.timestamp || c.createdAt, synced: true,
                                    }))}
                                    loading={loadingDetail} title="Commits"
                                    onDeleted={handleCommitDeleted}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modals ─────────────────────────────────────────────────────────── */}
            {showPush && (
                <PushCommitModal
                    habits={habits}
                    defaultHabitName={selectedHabitId ? habits.find((h) => h.id === selectedHabitId)?.name : undefined}
                    onClose={() => setShowPush(false)} onSuccess={handlePushSuccess}
                />
            )}
            {showNewHabit && (
                <NewHabitModal onClose={() => setShowNewHabit(false)} onCreated={handleNewHabit} />
            )}
            {showClearCommits && habitDetail && (
                <ConfirmDialog
                    title={`Clear all commits for "${habitDetail.name}"?`}
                    description={`Permanently deletes all ${habitDetail.commitCount} commit${habitDetail.commitCount !== 1 ? "s" : ""}. The habit remains.`}
                    confirmLabel="Clear commits"
                    loading={clearingCommits}
                    onConfirm={handleClearCommits}
                    onCancel={() => setShowClearCommits(false)}
                />
            )}
            {pendingDeleteHabit && (
                <ConfirmDialog
                    title={`Delete "${pendingDeleteHabit.name}"?`}
                    description="This permanently deletes the habit and all its commits."
                    confirmLabel="Delete habit"
                    loading={deletingHabit}
                    onConfirm={handleConfirmDeleteHabit}
                    onCancel={() => setPendingDeleteHabit(null)}
                />
            )}
        </div>
    );
}

function StatCard({ value, label }: { value: number; label: string }) {
    return (
        <div className="px-6 first:pl-0 py-1 space-y-0.5">
            <div className="text-3xl font-black tracking-tight tabular-nums font-mono leading-none">{value}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--ink-muted))]">{label}</div>
        </div>
    );
}
