"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BellRing, Check, Copy, ExternalLink, Moon, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { usePrefsStore } from "@/store/prefsStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Section, Toggle } from "./Section";

const HOURS = [18, 19, 20, 21, 22, 23];

export function NotificationsSection() {
    const prefs = usePrefsStore((s) => s.prefs);
    const update = usePrefsStore((s) => s.update);
    const [busy, setBusy] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [confirmRegenerate, setConfirmRegenerate] = useState(false);

    if (!prefs) return <Section title="Nightly reminder"><div className="h-16 shimmer-bg" /></Section>;

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

    const copyTopic = async () => {
        if (!prefs.ntfy) return;
        await navigator.clipboard.writeText(prefs.ntfy.topic);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Section icon={<Moon size={14} />} title="Nightly reminder" hint="A push notification in the evening listing habits you haven't committed yet. Sent with the free ntfy app.">
            <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold" htmlFor="nudge-hour">Remind me at</label>
                <div className="flex items-center gap-2">
                    <select
                        id="nudge-hour" value={prefs.nudgeHour} disabled={!prefs.nudgeEnabled || busy !== null}
                        onChange={(e) => run("hour", () => update({ nudgeHour: Number(e.target.value) }))}
                        className="input-brutal px-2 py-1 text-xs font-bold font-mono disabled:opacity-50"
                    >
                        {HOURS.map((h) => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                    <Toggle
                        label="Nightly reminder" checked={prefs.nudgeEnabled} disabled={busy !== null}
                        onChange={(v) => run("toggle", () => update({ nudgeEnabled: v }), v ? "Reminders on. Subscribe below to receive them." : "Reminders off.")}
                    />
                </div>
            </div>

            {prefs.nudgeEnabled && prefs.ntfy && (
                <div className="card-flat p-3 space-y-3 animate-fade-in">
                    <div className="flex gap-3">
                        <div className="p-1.5 bg-white border-2 border-[rgb(var(--border))] flex-shrink-0">
                            <QRCodeSVG value={prefs.ntfy.webUrl} size={84} marginSize={0} />
                        </div>
                        <ol className="text-[11px] leading-snug space-y-1 list-decimal pl-4">
                            <li>Install <a href="https://ntfy.sh/#subscribe-phone" target="_blank" rel="noopener noreferrer" className="font-bold underline">ntfy</a> (Android/iOS).</li>
                            <li>Scan the code, or tap <em>Open in ntfy</em> on your phone.</li>
                            <li>Send a test to check it works.</li>
                        </ol>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-[11px] font-mono truncate px-2 py-1.5 bg-[rgb(var(--paper-alt))]">{prefs.ntfy.topic}</code>
                        <button onClick={copyTopic} className="w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))]" aria-label="Copy channel name">
                            {copied ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <a href={prefs.ntfy.appUrl} className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]">
                            <Smartphone size={12} /> Open in ntfy
                        </a>
                        <a href={prefs.ntfy.webUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]">
                            <ExternalLink size={12} /> Web
                        </a>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={() => run("test", notificationsApi.test, "Test notification sent.")} disabled={busy !== null}
                            className="btn-press-sm flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-brand-500 text-white border-2 border-ink shadow-brutal-sm disabled:opacity-60"
                        >
                            <BellRing size={12} /> {busy === "test" ? "Sending…" : "Send test"}
                        </button>
                        <button onClick={() => setConfirmRegenerate(true)} className="flex items-center gap-1 text-[11px] font-bold text-[rgb(var(--ink-muted))] hover:text-[rgb(var(--ink))]">
                            <RefreshCw size={11} /> New channel
                        </button>
                    </div>
                    <p className="text-[10px] text-[rgb(var(--ink-muted))]">
                        Your channel name is private: anyone who knows it can read your reminders, so don&apos;t share it.
                    </p>
                </div>
            )}

            {confirmRegenerate && (
                <ConfirmDialog
                    title="Create a new channel?"
                    description="Your current channel stops receiving reminders. You'll need to subscribe to the new one in the ntfy app."
                    confirmLabel="Create new channel"
                    loading={busy === "regen"}
                    onConfirm={() => run("regen", () => update({ regenerateTopic: true }), "New channel created.").then(() => setConfirmRegenerate(false))}
                    onCancel={() => setConfirmRegenerate(false)}
                />
            )}
        </Section>
    );
}
