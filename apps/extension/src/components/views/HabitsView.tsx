import { useState, useRef, useEffect } from "react";
import { useHabitsStore } from "@/stores/habitsStore";
import { Plus, Pencil, Trash2, Check, X, GitBranch } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import type { Habit } from "@hagit/types";

export function HabitsView() {
    const { habits, loading, create, rename, remove, select, selectedHabit } = useHabitsStore();
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [creatingLoading, setCreatingLoading] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const newInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (creating) newInputRef.current?.focus();
    }, [creating]);

    useEffect(() => {
        if (editId) editInputRef.current?.focus();
    }, [editId]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreatingLoading(true);
        try {
            const habit = await create(newName.trim());
            select(habit);
            toast.success(`"${habit.name}" created.`);
            setNewName("");
            setCreating(false);
        } catch (e) {
            toast.error((e as Error).message || "Failed to create habit.");
        } finally {
            setCreatingLoading(false);
        }
    };

    const handleRename = async (id: number) => {
        if (!editName.trim()) { setEditId(null); return; }
        try {
            await rename(id, editName.trim());
            toast.success("Habit renamed.");
            setEditId(null);
        } catch (e) {
            toast.error((e as Error).message || "Failed to rename.");
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        setDeletingId(pendingDelete.id);
        try {
            await remove(pendingDelete.id);
            toast.success(`"${pendingDelete.name}" deleted.`);
            setPendingDelete(null);
        } catch (e) {
            toast.error((e as Error).message || "Failed to delete.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col animate-fade-in">
            {/* Toolbar */}
            <div className="border-b-2 border-[rgb(var(--border))] px-3 py-2.5 flex items-center justify-between bg-[rgb(var(--card-bg))]">
                <div className="flex items-center gap-2">
                    <div className="h-0.5 w-5 bg-brand-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                        {habits.length} habit{habits.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <button
                    onClick={() => { setCreating(true); setEditId(null); }}
                    className="btn-press-sm flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider bg-brand-500 text-white border-2 border-[rgb(var(--border))] shadow-brutal-sm transition-all"
                >
                    <Plus size={11} strokeWidth={3} />
                    New
                </button>
            </div>

            {/* New habit form */}
            {creating && (
                <div className="border-b-2 border-[rgb(var(--border))] p-3 bg-[rgb(var(--paper-alt))] animate-slide-up">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] mb-2">New habit</p>
                    <div className="flex gap-2">
                        <input
                            ref={newInputRef}
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                                if (e.key === "Escape") { setCreating(false); setNewName(""); }
                            }}
                            placeholder="e.g. Read 30 minutes..."
                            className="input-brutal flex-1 px-3 py-2 text-xs"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={creatingLoading || !newName.trim()}
                            className="btn-press-sm flex items-center justify-center w-9 h-9 bg-brand-500 border-2 border-[rgb(var(--border))] shadow-brutal-sm transition-all disabled:opacity-50 text-white flex-shrink-0"
                        >
                            {creatingLoading ? <Spinner className="border-white/30 border-t-white w-3 h-3" /> : <Check size={14} strokeWidth={3} />}
                        </button>
                        <button
                            onClick={() => { setCreating(false); setNewName(""); }}
                            className="flex items-center justify-center w-9 h-9 border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all flex-shrink-0"
                        >
                            <X size={13} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            {/* Habits list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {loading ? (
                    <div className="p-3 space-y-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 shimmer-bg border-2 border-[rgb(var(--border))]" style={{ opacity: 1 - i * 0.2 }} />
                        ))}
                    </div>
                ) : habits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="w-10 h-10 border-2 border-[rgb(var(--border))] flex items-center justify-center mb-3 shadow-brutal-sm">
                            <GitBranch size={16} className="text-[rgb(var(--ink-muted))]" />
                        </div>
                        <p className="font-black text-sm">No habits yet.</p>
                        <p className="text-xs text-[rgb(var(--ink-muted))] mt-1">Hit "New" to create your first habit.</p>
                    </div>
                ) : (
                    <div>
                        {habits.map((habit, i) => (
                            <div
                                key={habit.id}
                                className={cn(
                                    "group border-b-2 border-[rgb(var(--border))] animate-fade-in",
                                    selectedHabit?.id === habit.id && "bg-[rgb(var(--card-bg))]"
                                )}
                                style={{ animationDelay: `${i * 30}ms` }}
                            >
                                {editId === habit.id ? (
                                    /* Inline rename row */
                                    <div className="flex items-center gap-2 p-2.5">
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleRename(habit.id);
                                                if (e.key === "Escape") setEditId(null);
                                            }}
                                            className="input-brutal flex-1 px-2.5 py-1.5 text-xs"
                                        />
                                        <button onClick={() => handleRename(habit.id)}
                                            className="btn-press-sm w-7 h-7 flex items-center justify-center bg-brand-500 text-white border-2 border-[rgb(var(--border))] shadow-brutal-sm transition-all flex-shrink-0">
                                            <Check size={11} strokeWidth={3} />
                                        </button>
                                        <button onClick={() => setEditId(null)}
                                            className="w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all flex-shrink-0">
                                            <X size={11} strokeWidth={3} />
                                        </button>
                                    </div>
                                ) : (
                                    /* Normal habit row */
                                    <div className="flex items-center gap-0">
                                        <button
                                            onClick={() => select(habit)}
                                            className="flex-1 flex items-center gap-3 px-3 py-3 text-left hover:bg-[rgb(var(--paper-alt))] transition-colors min-w-0"
                                        >
                                            {/* Active indicator */}
                                            <div className={cn(
                                                "w-1.5 h-1.5 border border-[rgb(var(--border))] flex-shrink-0 transition-colors",
                                                selectedHabit?.id === habit.id ? "bg-brand-500 border-brand-600" : "bg-transparent"
                                            )} />
                                            <span className="text-xs font-bold truncate">{habit.name}</span>
                                            <span className="ml-auto font-mono text-[10px] text-[rgb(var(--ink-muted))] flex-shrink-0">
                                                {habit.commitCount}
                                            </span>
                                        </button>

                                        {/* Action buttons — always rendered, visible on hover */}
                                        <div className="flex items-center border-l-2 border-[rgb(var(--border))]">
                                            <button
                                                onClick={() => { setEditId(habit.id); setEditName(habit.name); setCreating(false); }}
                                                className="w-8 h-full flex items-center justify-center border-r-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors py-3 opacity-0 group-hover:opacity-100"
                                                title="Rename"
                                            >
                                                <Pencil size={11} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => setPendingDelete(habit)}
                                                className="w-8 h-full flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors py-3 opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                <Trash2 size={11} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {pendingDelete && (
                <ConfirmDialog
                    title={`Delete "${pendingDelete.name}"?`}
                    description="This permanently deletes the habit and all its commits."
                    confirmLabel="Delete habit"
                    loading={deletingId === pendingDelete.id}
                    onConfirm={handleDelete}
                    onCancel={() => setPendingDelete(null)}
                />
            )}
        </div>
    );
}
