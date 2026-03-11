"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { habitsApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import type { Habit } from "@hagit/types";
import { cn } from "@/lib/utils";
import { Plus, Sun, Moon, Copy, Check, LogOut, Trash2, X } from "lucide-react";
import { NewHabitModal } from "./NewHabitModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const MIN_WIDTH = 200;
const MAX_WIDTH = 440;
const DEFAULT_WIDTH = 272;

interface SidebarProps {
    selectedHabitId: number | null;
    onSelectHabit: (id: number | null) => void;
    habits: Habit[];
    onHabitsChange: (habits: Habit[]) => void;
    onHabitDeleted?: (habitId: number) => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

export function Sidebar({
    selectedHabitId,
    onSelectHabit,
    habits,
    onHabitsChange,
    onHabitDeleted,
    mobileOpen,
    onMobileClose,
}: SidebarProps) {
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const [loadingHabits, setLoadingHabits] = useState(true);
    const [showNewHabit, setShowNewHabit] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pendingDeleteHabit, setPendingDeleteHabit] = useState<Habit | null>(null);
    const [deletingHabit, setDeletingHabit] = useState(false);

    // ── Resizable sidebar ──────────────────────────────────────────────────────
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
    const sidebarRef = useRef<HTMLElement>(null);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);
    const liveWidth = useRef(DEFAULT_WIDTH);

    useEffect(() => {
        const stored = parseInt(localStorage.getItem("hagit_sidebar_width") || "", 10);
        const w = !isNaN(stored) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored)) : DEFAULT_WIDTH;
        setSidebarWidth(w);
        liveWidth.current = w;
    }, []);

    const onResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = e.clientX - startX.current;
        const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
        liveWidth.current = newW;
        if (sidebarRef.current) {
            sidebarRef.current.style.width = `${newW}px`;
        }
    }, []);

    const onResizeEnd = useCallback(() => {
        if (!isResizing.current) return;
        isResizing.current = false;
        const w = liveWidth.current;
        setSidebarWidth(w);
        localStorage.setItem("hagit_sidebar_width", String(w));
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeEnd);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
    }, [onResizeMove]);

    const handleResizeMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            isResizing.current = true;
            startX.current = e.clientX;
            startWidth.current = liveWidth.current;
            document.addEventListener("mousemove", onResizeMove);
            document.addEventListener("mouseup", onResizeEnd);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        },
        [onResizeMove, onResizeEnd]
    );

    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", onResizeMove);
            document.removeEventListener("mouseup", onResizeEnd);
        };
    }, [onResizeMove, onResizeEnd]);

    // ── Data ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        habitsApi
            .list()
            .then(onHabitsChange)
            .finally(() => setLoadingHabits(false));
    }, []);

    const handleLogout = () => {
        logout();
        router.push("/auth/login");
    };

    const copyToken = () => {
        if (user?.token) {
            navigator.clipboard.writeText(user.token);
            setCopied(true);
            toast.success("Token copied");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleNewHabit = (habit: Habit) => {
        onHabitsChange([...habits, habit]);
        setShowNewHabit(false);
        toast.success(`"${habit.name}" created`);
    };

    const handleConfirmDeleteHabit = async () => {
        if (!pendingDeleteHabit) return;
        setDeletingHabit(true);
        try {
            await habitsApi.delete(pendingDeleteHabit.id);
            onHabitsChange(habits.filter((h) => h.id !== pendingDeleteHabit.id));
            onHabitDeleted?.(pendingDeleteHabit.id);
            toast.success(`"${pendingDeleteHabit.name}" deleted`);
            setPendingDeleteHabit(null);
        } catch {
            toast.error("Failed to delete habit.");
        } finally {
            setDeletingHabit(false);
        }
    };

    // ── Shared inner content ──────────────────────────────────────────────────
    const sidebarContent = (
        <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-slate-800/80 flex-shrink-0">
                <button
                    onClick={() => { onSelectHabit(null); onMobileClose(); }}
                    className="flex items-center gap-2.5 group"
                >
                    <div className="w-7 h-7 border border-brand-500/50 rounded-lg flex items-center justify-center">
                        <span className="text-brand-600 dark:text-brand-400 font-bold text-[10px] font-mono">hG</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        haGIT
                    </span>
                </button>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    {/* Mobile close */}
                    <button
                        onClick={onMobileClose}
                        className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Habits list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-0.5">
                {/* Section header */}
                <div className="flex items-center justify-between px-2 pt-1 pb-2.5">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                        Habits
                    </span>
                    <button
                        onClick={() => setShowNewHabit(true)}
                        className="flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors px-1.5 py-0.5 rounded-md hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    >
                        <Plus size={11} strokeWidth={2.5} />
                        New habit
                    </button>
                </div>

                {loadingHabits ? (
                    <div className="space-y-1">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-9 rounded-lg shimmer-bg mx-1" />
                        ))}
                    </div>
                ) : habits.length === 0 ? (
                    <div className="px-2 py-6 text-center space-y-2">
                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                            No habits yet.
                        </p>
                        <button
                            onClick={() => setShowNewHabit(true)}
                            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                        >
                            Create your first habit
                        </button>
                    </div>
                ) : (
                    habits.map((habit) => {
                        const isSelected = selectedHabitId === habit.id;
                        return (
                            <div key={habit.id} className="group flex items-center gap-1 rounded-lg">
                                {/* Main clickable row */}
                                <button
                                    onClick={() => { onSelectHabit(isSelected ? null : habit.id); onMobileClose(); }}
                                    className={cn(
                                        "flex-1 flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all duration-100 min-w-0",
                                        isSelected
                                            ? "bg-brand-50 dark:bg-brand-900/20"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    )}
                                >
                                    {/* Active indicator dot */}
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors",
                                        isSelected ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-700"
                                    )} />

                                    {/* Name */}
                                    <span className={cn(
                                        "text-sm truncate flex-1",
                                        isSelected
                                            ? "text-brand-700 dark:text-brand-300 font-medium"
                                            : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {habit.name}
                                    </span>

                                    {/* Commit count */}
                                    <span className={cn(
                                        "text-xs font-mono flex-shrink-0 tabular-nums",
                                        isSelected
                                            ? "text-brand-500 dark:text-brand-400"
                                            : "text-slate-400 dark:text-slate-600"
                                    )}>
                                        {habit.commitCount}
                                    </span>
                                </button>

                                {/* Delete — visible on group hover, no overlap */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setPendingDeleteHabit(habit); }}
                                    className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all mr-0.5"
                                    title="Delete habit"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800/80 p-4 space-y-3">
                {/* User email */}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate px-1">
                    {user?.email}
                </p>

                {/* Token block */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate flex-1">
                            {user?.token ? `${user.token.slice(0, 22)}…` : "—"}
                        </code>
                        <button
                            onClick={copyToken}
                            className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                            title="Copy token"
                        >
                            {copied ? (
                                <Check size={11} className="text-brand-500" />
                            ) : (
                                <Copy size={11} />
                            )}
                        </button>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                        <code className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            hagit login -t &lt;your-token&gt;
                        </code>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                >
                    <LogOut size={13} />
                    Sign out
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* ── Desktop sidebar (resizable) ────────────────────────────────────── */}
            <aside
                ref={sidebarRef}
                style={{ width: sidebarWidth }}
                className="hidden lg:flex flex-col flex-shrink-0 h-screen relative border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#10121b] transition-none"
            >
                {sidebarContent}

                {/* Drag handle */}
                <div
                    onMouseDown={handleResizeMouseDown}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize group/handle z-10 hover:bg-brand-400/30 transition-colors"
                    title="Drag to resize"
                >
                    <div className="absolute top-1/2 right-0 -translate-y-1/2 w-0.5 h-12 rounded-full bg-slate-200 dark:bg-slate-700 opacity-0 group-hover/handle:opacity-100 transition-opacity" />
                </div>
            </aside>

            {/* ── Mobile overlay drawer ──────────────────────────────────────────── */}
            {/* Backdrop */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    onClick={onMobileClose}
                />
            )}

            {/* Drawer */}
            <aside
                className={cn(
                    "lg:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10121b] transition-transform duration-300 ease-in-out",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>

            {showNewHabit && (
                <NewHabitModal
                    onClose={() => setShowNewHabit(false)}
                    onCreated={handleNewHabit}
                />
            )}

            {pendingDeleteHabit && (
                <ConfirmDialog
                    title={`Delete "${pendingDeleteHabit.name}"?`}
                    description="This will permanently delete the habit and all of its commits. This action cannot be undone."
                    confirmLabel="Delete habit"
                    loading={deletingHabit}
                    onConfirm={handleConfirmDeleteHabit}
                    onCancel={() => setPendingDeleteHabit(null)}
                />
            )}
        </>
    );
}
