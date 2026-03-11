import { useEffect, useState } from "react";
import { useCommitsStore } from "@/stores/commitsStore";
import { useHabitsStore } from "@/stores/habitsStore";
import { format, formatDistanceToNow } from "date-fns";
import { Trash2, Filter, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { Commit } from "@/types";

export function RecentView() {
  const { commits, loading, fetch, remove, filter, setFilter } = useCommitsStore();
  const { habits } = useHabitsStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Commit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch();
  }, []);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      await remove(pendingDelete.id);
      toast.success("Commit deleted.");
      setPendingDelete(null);
    } catch {
      toast.error("Failed to delete commit.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="border-b-2 border-[rgb(var(--border))] px-3 py-2.5 flex items-center justify-between bg-[rgb(var(--card-bg))] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-5 bg-brand-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
            {filter ? (
              <span>
                Filtered: <span className="text-[rgb(var(--ink))]">{filter}</span>
              </span>
            ) : `${commits.length} commits`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Filter toggle */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold border-2 border-[rgb(var(--border))] transition-colors",
                filter ? "bg-brand-500 text-white" : "hover:bg-[rgb(var(--paper-alt))]"
              )}
            >
              <Filter size={10} strokeWidth={2.5} />
              Filter
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[rgb(var(--card-bg))] border-2 border-[rgb(var(--border))] shadow-brutal z-40 min-w-[140px] animate-fade-in">
                <button
                  onClick={() => { setFilter(null); setFilterOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs font-bold border-b border-[rgb(var(--paper-alt))] hover:bg-[rgb(var(--paper-alt))] transition-colors",
                    !filter && "text-brand-700"
                  )}
                >
                  All habits
                </button>
                {habits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => { setFilter(h.name); setFilterOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-bold border-b border-[rgb(var(--paper-alt))] last:border-0 hover:bg-[rgb(var(--paper-alt))] transition-colors truncate",
                      filter === h.name && "text-brand-700"
                    )}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetch(filter ?? undefined)}
            disabled={loading}
            className="flex items-center justify-center w-7 h-7 border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={10} strokeWidth={2.5} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading && commits.length === 0 ? (
          <div className="p-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-2.5 py-2.5 border-b border-dashed border-[rgb(var(--paper-alt))]" style={{ opacity: 1 - i * 0.18 }}>
                <div className="w-2 h-2 shimmer-bg flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 shimmer-bg" style={{ width: `${55 + i * 8}%` }} />
                  <div className="h-2.5 shimmer-bg w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <p className="font-black text-sm">No commits found.</p>
            <p className="text-xs text-[rgb(var(--ink-muted))] mt-1">
              {filter ? `No commits for "${filter}" yet.` : "Push your first commit to get started."}
            </p>
          </div>
        ) : (
          <div>
            {commits.map((commit, i) => (
              <div
                key={commit.id}
                className="group flex items-start gap-2.5 px-3 py-2.5 border-b border-dashed border-[rgb(var(--paper-alt))] hover:bg-[rgb(var(--card-bg))] transition-colors animate-fade-in"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                {/* Dot */}
                <div className="w-2 h-2 border-2 border-brand-500 bg-brand-500 flex-shrink-0 mt-1" />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-bold leading-snug">{commit.message}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black border border-[rgb(var(--border))] px-1.5 py-px text-[rgb(var(--ink-muted))] whitespace-nowrap">
                      {commit.habitName}
                    </span>
                    <span className="text-[9px] text-[rgb(var(--ink-muted))]">
                      {formatDistanceToNow(new Date(commit.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Right: date + delete */}
                <div className="flex-shrink-0 flex items-start gap-1.5 pt-0.5">
                  <span className="text-[9px] font-mono text-[rgb(var(--ink-muted))] whitespace-nowrap">
                    {format(new Date(commit.timestamp), "MMM d")}
                  </span>
                  <button
                    onClick={() => setPendingDelete(commit)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center border border-[rgb(var(--border))] hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this commit?"
          description={`"${pendingDelete.message}" will be permanently removed.`}
          confirmLabel="Delete"
          loading={deletingId === pendingDelete.id}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
