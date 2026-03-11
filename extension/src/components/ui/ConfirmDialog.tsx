import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel = "Delete", loading, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { cancelRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full bg-[rgb(var(--paper))] border-2 border-[rgb(var(--border))] shadow-brutal-lg animate-bounce-in p-5">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
        >
          <X size={11} strokeWidth={3} />
        </button>

        <div className="h-0.5 w-7 bg-red-500 mb-3" />
        <h3 className="text-sm font-black pr-8 leading-snug mb-2">{title}</h3>
        {description && (
          <p className="text-xs text-[rgb(var(--ink-muted))] mb-5 leading-relaxed">{description}</p>
        )}

        <div className="flex gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-press flex-1 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white border-2 border-[rgb(var(--border))] shadow-brutal-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1">
                <span className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Working
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
