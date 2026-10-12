"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Commit, HabitDetail as HabitDetailData } from "@hagit/types";
import type { AggregatedCommit, CommitByHabit } from "@/types";
import { commitsApi, habitsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { habitSlots, seriesColor } from "@/lib/habit-colors";
import { useAuthStore } from "@/store/authStore";
import { CelebrateProvider } from "@/components/ui/Celebrate";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AppHeader } from "@/components/home/AppHeader";
import { AppChrome } from "@/components/home/AppChrome";
import { Hero } from "@/components/home/Hero";
import { GettingStarted } from "@/components/home/GettingStarted";
import { HabitCard, NewHabitCard } from "@/components/home/HabitCard";
import { Heatmap } from "@/components/home/Heatmap";
import { DayCommits } from "@/components/home/DayCommits";
import { ActivityGraph } from "@/components/home/ActivityGraph";
import { WeekChart } from "@/components/home/WeekChart";
import { Achievements } from "@/components/home/Achievements";
import { RecommendedReads } from "@/components/home/RecommendedReads";
import { HabitDetail } from "@/components/home/HabitDetail";
import { HabitNameModal } from "@/components/home/HabitNameModal";
import { Card, SectionTitle } from "@/components/home/Section";
import type { HabitView } from "@/components/home/types";

const FEED_PAGE = 12;

export default function DashboardPage() {
    return (
        <Suspense fallback={null}>
            <CelebrateProvider>
                <Dashboard />
            </CelebrateProvider>
        </Suspense>
    );
}

function Dashboard() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const email = useAuthStore((s) => s.user?.email);
    const selectedHabitId = Number(searchParams.get("habit")) || null;

    const [byHabit, setByHabit] = useState<CommitByHabit[]>([]);
    const [aggregated, setAggregated] = useState<AggregatedCommit[]>([]);
    const [feed, setFeed] = useState<Commit[]>([]);
    const [feedLimit, setFeedLimit] = useState(FEED_PAGE);
    const [loading, setLoading] = useState(true);

    const [detail, setDetail] = useState<HabitDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [dayCommits, setDayCommits] = useState<Commit[]>([]);
    const [loadingDay, setLoadingDay] = useState(false);

    const [creating, setCreating] = useState(false);
    const [renaming, setRenaming] = useState<HabitView | null>(null);
    const [clearing, setClearing] = useState<HabitView | null>(null);
    const [deleting, setDeleting] = useState<HabitView | null>(null);
    const [deletingCommit, setDeletingCommit] = useState<Commit | null>(null);
    const [busy, setBusy] = useState(false);

    // ── Data ────────────────────────────────────────────────────────────────
    const refresh = useCallback(async (limit = feedLimit) => {
        const [h, a, f] = await Promise.all([commitsApi.byHabit(), commitsApi.aggregated(), commitsApi.list({ limit })]);
        setByHabit(h);
        setAggregated(a);
        setFeed(f);
    }, [feedLimit]);

    useEffect(() => {
        refresh().catch(() => toast.error("Couldn't load your habits.")).finally(() => setLoading(false));
        // Initial load only; later refreshes are explicit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // "New habit" from other pages links here with ?new=1.
    useEffect(() => {
        if (searchParams.get("new") !== "1") return;
        setCreating(true);
        router.replace(pathname, { scroll: false });
    }, [searchParams, router, pathname]);

    const loadDetail = useCallback(async (id: number) => {
        setLoadingDetail(true);
        try { setDetail(await habitsApi.get(id)); }
        catch { setDetail(null); }
        finally { setLoadingDetail(false); }
    }, []);

    useEffect(() => {
        if (selectedHabitId === null) { setDetail(null); return; }
        loadDetail(selectedHabitId);
        window.scrollTo({ top: 0 });
    }, [selectedHabitId, loadDetail]);

    const afterChange = useCallback(async () => {
        await refresh();
        if (selectedHabitId !== null) await loadDetail(selectedHabitId);
        if (selectedDate) commitsApi.onDay(selectedDate).then(setDayCommits).catch(() => undefined);
    }, [refresh, loadDetail, selectedHabitId, selectedDate]);

    // ── Derived ─────────────────────────────────────────────────────────────
    const habits: HabitView[] = useMemo(() => {
        const slots = habitSlots(byHabit.map((h) => ({ id: h.habitId, createdAt: h.createdAt })));
        return byHabit.map((h) => {
            const slot = slots.get(h.habitId) ?? 0;
            return { ...h, slot, color: seriesColor(slot) };
        });
    }, [byHabit]);

    const colorByName = useMemo(() => new Map(habits.map((h) => [h.habitName, h.color])), [habits]);
    const colorOf = useCallback((name: string) => colorByName.get(name) ?? "rgb(var(--ink-muted))", [colorByName]);
    const habitOrder = useMemo(() => [...habits].sort((a, b) => a.slot - b.slot).map((h) => h.habitName), [habits]);
    const counts = useMemo(() => Object.fromEntries(aggregated.map((d) => [d.date, d.count])), [aggregated]);

    const totalCommits = habits.reduce((s, h) => s + h.commitCount, 0);
    const weekCommits = habits.reduce((s, h) => s + h.recent.slice(-7).reduce((a, b) => a + b, 0), 0);
    const lastWeekCommits = habits.reduce((s, h) => s + h.recent.slice(0, 7).reduce((a, b) => a + b, 0), 0);
    const openToday = habits.filter((h) => !h.committedToday).length;
    const selected = habits.find((h) => h.habitId === selectedHabitId);

    // ── Navigation ──────────────────────────────────────────────────────────
    const openHabit = (id: number | null) => router.push(id ? `${pathname}?habit=${id}` : pathname, { scroll: false });

    const toggleDay = async (date: string) => {
        if (selectedDate === date) { setSelectedDate(null); return; }
        setSelectedDate(date);
        setLoadingDay(true);
        try { setDayCommits(await commitsApi.onDay(date)); }
        catch { setDayCommits([]); }
        finally { setLoadingDay(false); }
    };

    // ── Mutations ───────────────────────────────────────────────────────────
    const run = async (work: () => Promise<unknown>, success: string, failure: string, done: () => void) => {
        setBusy(true);
        try {
            await work();
            toast.success(success);
            done();
            await afterChange();
        } catch (error) {
            toast.error(apiErrorMessage(error, failure));
        } finally {
            setBusy(false);
        }
    };

    const confirmClear = () => clearing && run(
        () => commitsApi.deleteByHabit(clearing.habitId),
        `Cleared commits for ${clearing.habitName}.`, "Couldn't clear commits.", () => setClearing(null),
    );
    const confirmDelete = () => deleting && run(
        () => habitsApi.delete(deleting.habitId),
        `Deleted ${deleting.habitName}.`, "Couldn't delete the habit.",
        () => { if (selectedHabitId === deleting.habitId) openHabit(null); setDeleting(null); },
    );
    const confirmDeleteCommit = () => deletingCommit && run(
        () => commitsApi.delete(deletingCommit.id),
        "Commit deleted.", "Couldn't delete the commit.", () => setDeletingCommit(null),
    );

    const loadMore = async () => {
        const next = feedLimit + FEED_PAGE;
        setFeedLimit(next);
        setFeed(await commitsApi.list({ limit: next }));
    };

    const focusQuickCommit = () => {
        const el = document.getElementById("quick-commit-input");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--paper))]">
            <AppHeader onNewHabit={() => setCreating(true)} onHome={() => openHabit(null)} />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-28 md:pb-12">
                {selectedHabitId !== null ? (
                    selected ? (
                        <HabitDetail
                            habit={selected}
                            habits={habits}
                            detail={detail?.id === selected.habitId ? detail : null}
                            loading={loadingDetail}
                            onBack={() => openHabit(null)}
                            onCommitted={() => afterChange()}
                            onDeleteCommit={setDeletingCommit}
                            onRename={() => setRenaming(selected)}
                            onClear={() => setClearing(selected)}
                            onDelete={() => setDeleting(selected)}
                        />
                    ) : loading ? (
                        <div className="space-y-4"><div className="h-48 shimmer-bg" /><div className="h-64 shimmer-bg" /></div>
                    ) : (
                        <div className="card p-8 text-center">
                            <p className="font-mono text-sm">error: pathspec did not match any habit</p>
                            <button onClick={() => openHabit(null)} className="mt-4 text-sm font-bold underline decoration-brand-500 decoration-2 underline-offset-2">Back to today</button>
                        </div>
                    )
                ) : (
                    <div className="space-y-6 sm:space-y-8 animate-fade-in">
                        {loading ? (
                            <div className="h-56 shimmer-bg border-2 border-[rgb(var(--border))]/30" />
                        ) : (
                            <Hero
                                email={email}
                                habits={habits}
                                weekCommits={weekCommits}
                                lastWeekCommits={lastWeekCommits}
                                totalCommits={totalCommits}
                                onCommitted={() => afterChange()}
                                onCreateHabit={() => setCreating(true)}
                            />
                        )}

                        {!loading && (
                            <GettingStarted
                                habitCount={habits.length}
                                commitCount={totalCommits}
                                onCreateHabit={() => setCreating(true)}
                                onFirstCommit={focusQuickCommit}
                            />
                        )}

                        <section>
                            <SectionTitle
                                title="habits"
                                meta={habits.length ? `${habits.length - openToday} of ${habits.length} committed today` : undefined}
                            />
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {loading
                                    ? [0, 1, 2].map((i) => <div key={i} className="h-[220px] shimmer-bg" />)
                                    : habits.map((h) => (
                                        <HabitCard
                                            key={h.habitId}
                                            habit={h}
                                            isLastOpen={!h.committedToday && openToday === 1}
                                            onOpen={() => openHabit(h.habitId)}
                                            onChanged={() => afterChange()}
                                            onRename={() => setRenaming(h)}
                                            onClear={() => setClearing(h)}
                                            onDelete={() => setDeleting(h)}
                                        />
                                    ))}
                                {!loading && <NewHabitCard onClick={() => setCreating(true)} />}
                            </div>
                        </section>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
                            <div className="space-y-6 min-w-0">
                                <Card>
                                    <SectionTitle title="contributions" meta="Every commit, every habit. Tap a day to see it." />
                                    {loading ? <div className="h-36 shimmer-bg" /> : (
                                        <Heatmap counts={counts} selectedDate={selectedDate} onDayClick={toggleDay} />
                                    )}
                                    {selectedDate && (
                                        <DayCommits
                                            date={selectedDate} commits={dayCommits} loading={loadingDay}
                                            colorOf={colorOf} onClose={() => setSelectedDate(null)} onDelete={setDeletingCommit}
                                        />
                                    )}
                                </Card>

                                <Card>
                                    <SectionTitle prefix="$ " title="git log --graph" meta="Recent commits, one lane per habit" />
                                    <ActivityGraph
                                        commits={feed}
                                        colorOf={colorOf}
                                        habitOrder={habitOrder}
                                        onDelete={setDeletingCommit}
                                        loading={loading}
                                        hasMore={feed.length >= feedLimit}
                                        onLoadMore={loadMore}
                                    />
                                </Card>
                            </div>

                            <aside className="space-y-6 min-w-0">
                                <Card>
                                    <SectionTitle title="this-week" />
                                    {loading ? <div className="h-40 shimmer-bg" /> : <WeekChart habits={habits} />}
                                </Card>
                                <Card>
                                    <SectionTitle title="achievements" />
                                    {loading ? <div className="h-40 shimmer-bg" /> : <Achievements habits={habits} totalCommits={totalCommits} />}
                                </Card>
                                {!loading && (
                                    <Card>
                                        <SectionTitle title="worth-reading" action={<Link href="/kb" className="text-xs font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">Library →</Link>} />
                                        <RecommendedReads habits={habits} />
                                    </Card>
                                )}
                            </aside>
                        </div>
                    </div>
                )}
            </main>

            <AppChrome />

            {(creating || renaming) && (
                <HabitNameModal
                    habit={renaming ? { id: renaming.habitId, name: renaming.habitName } : undefined}
                    onClose={() => { setCreating(false); setRenaming(null); }}
                    onSaved={(h) => {
                        toast.success(renaming ? `Renamed to ${h.name}.` : `Created ${h.name}. Make your first commit!`);
                        setCreating(false);
                        setRenaming(null);
                        afterChange();
                    }}
                />
            )}
            {clearing && (
                <ConfirmDialog
                    title={`Clear all commits for "${clearing.habitName}"?`}
                    description={`Permanently deletes ${clearing.commitCount} commit${clearing.commitCount === 1 ? "" : "s"} and resets its streak. The habit stays.`}
                    confirmLabel="Clear commits"
                    loading={busy}
                    onConfirm={confirmClear}
                    onCancel={() => setClearing(null)}
                />
            )}
            {deleting && (
                <ConfirmDialog
                    title={`Delete "${deleting.habitName}"?`}
                    description="This permanently deletes the habit and all of its commits."
                    confirmLabel="Delete habit"
                    loading={busy}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleting(null)}
                />
            )}
            {deletingCommit && (
                <ConfirmDialog
                    title="Delete this commit?"
                    description={`"${deletingCommit.message}" will be removed from ${deletingCommit.habitName}. Streaks are recalculated.`}
                    confirmLabel="Delete commit"
                    loading={busy}
                    onConfirm={confirmDeleteCommit}
                    onCancel={() => setDeletingCommit(null)}
                />
            )}
        </div>
    );
}
