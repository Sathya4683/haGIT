import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastId = 0;
let globalShow: ((type: "success" | "error", msg: string) => void) | null = null;

export function toast(type: "success" | "error", message: string) {
  globalShow?.(type, message);
}
toast.success = (msg: string) => toast("success", msg);
toast.error = (msg: string) => toast("error", msg);

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastId;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
  }, []);

  useEffect(() => {
    globalShow = show;
    return () => { globalShow = null; };
  }, [show]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-2 left-2 right-2 z-[100] space-y-1.5 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 border-2 border-[rgb(var(--border))] text-xs font-bold animate-slide-up pointer-events-auto shadow-brutal",
            t.type === "success" ? "bg-brand-500 text-white" : "bg-red-600 text-white"
          )}
        >
          {t.type === "success"
            ? <CheckCircle2 size={13} className="flex-shrink-0" />
            : <XCircle size={13} className="flex-shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={11} strokeWidth={3} />
          </button>
        </div>
      ))}
    </div>
  );
}
