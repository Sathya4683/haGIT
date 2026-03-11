"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  confirmLabel?: string;
  confirmClassName?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title, description, confirmLabel = "Delete",
  confirmClassName, loading = false, onConfirm, onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancelRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm bg-[rgb(var(--paper))] border-2 border-[rgb(var(--border))] shadow-brutal-lg dark:shadow-brutal-dark animate-bounce-in p-6"
        role="alertdialog"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-colors"
        >
          <X size={13} strokeWidth={2.5} />
        </button>

        <div className="mb-1">
          <div className="h-1 w-8 bg-red-500 mb-4" />
          <h2 className="text-base font-black leading-snug pr-8">{title}</h2>
        </div>
        <p className="text-sm text-[rgb(var(--ink-muted))] leading-relaxed mb-6">{description}</p>

        <div className="flex gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="btn-press flex-1 py-2.5 font-bold text-sm border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "btn-press flex-1 py-2.5 font-bold text-sm text-white transition-all disabled:opacity-50",
              confirmClassName ?? "bg-red-600 hover:bg-red-700 border-2 border-ink shadow-brutal"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Working...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
