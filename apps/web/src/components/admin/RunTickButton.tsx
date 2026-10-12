"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";

export function RunTickButton({ subtle }: { subtle?: boolean }) {
    const router = useRouter();
    const [running, setRunning] = useState(false);

    const run = async () => {
        setRunning(true);
        try {
            const res = await fetch("/api/admin/jobs", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Tick failed.");
            const nudges = data["nightly-nudge"]?.sent ?? 0;
            const reports = data["weekly-report"]?.sent ?? 0;
            toast.success(`Tick finished: ${nudges} reminder${nudges === 1 ? "" : "s"}, ${reports} report${reports === 1 ? "" : "s"} sent.`);
            router.refresh();
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setRunning(false);
        }
    };

    return (
        <button
            onClick={run}
            disabled={running}
            className={subtle
                ? "btn-press-sm flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] disabled:opacity-60"
                : "btn-press-sm flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal-sm disabled:opacity-60"}
        >
            <Play size={12} /> {running ? "Running…" : "Run tick now"}
        </button>
    );
}
