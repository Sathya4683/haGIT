"use client";

import { useState } from "react";
import { Download, FileText, Mail } from "lucide-react";
import { toast } from "sonner";
import { reportsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { usePrefsStore } from "@/store/prefsStore";
import { Section, Toggle } from "./Section";

export function ReportSection() {
    const prefs = usePrefsStore((s) => s.prefs);
    const update = usePrefsStore((s) => s.update);
    const [busy, setBusy] = useState<string | null>(null);

    if (!prefs) return null;

    const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
        setBusy(key);
        try {
            await fn();
            if (ok) toast.success(ok);
        } catch (error) {
            toast.error(apiErrorMessage(error, "Something went wrong."));
        } finally {
            setBusy(null);
        }
    };

    const button = "btn-press-sm flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] disabled:opacity-60";

    return (
        <Section icon={<FileText size={14} />} title="Weekly report" hint="A one-page summary of your week (PDF) with a few library articles picked for you.">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-bold">Email it to me</p>
                    <p className="text-[11px] text-[rgb(var(--ink-muted))] truncate">Mondays at 08:00 · {prefs.email}</p>
                </div>
                <Toggle
                    label="Weekly report email" checked={prefs.weeklyReportEnabled} disabled={busy !== null}
                    onChange={(v) => run("toggle", () => update({ weeklyReportEnabled: v }), v ? "Weekly reports on." : "Weekly reports off.")}
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => run("pdf", () => reportsApi.downloadPdf("current"))} disabled={busy !== null} className={button}>
                    <Download size={12} /> {busy === "pdf" ? "Building…" : "This week's PDF"}
                </button>
                <button onClick={() => run("email", reportsApi.emailPreview, `Preview sent to ${prefs.email}.`)} disabled={busy !== null} className={button}>
                    <Mail size={12} /> {busy === "email" ? "Sending…" : "Email a preview"}
                </button>
            </div>
        </Section>
    );
}
