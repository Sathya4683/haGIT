"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { accountApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { useAuthStore } from "@/store/authStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Section } from "./Section";

const mask = (token: string) => (token.length > 16 ? `${token.slice(0, 8)}••••••••${token.slice(-6)}` : "••••••••");

export function TokenSection() {
    const { user, setUser } = useAuthStore();
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const [rotating, setRotating] = useState(false);

    const copy = async () => {
        if (!user?.token) return;
        await navigator.clipboard.writeText(user.token);
        setCopied(true);
        toast.success("Token copied");
        setTimeout(() => setCopied(false), 2000);
    };

    const rotate = async () => {
        setRotating(true);
        try {
            const fresh = await accountApi.rotateToken();
            setUser(fresh);
            setConfirmRotate(false);
            toast.success("New token issued. Every other session, CLI and extension was signed out.");
        } catch (error) {
            toast.error(apiErrorMessage(error, "Failed to rotate the token."));
        } finally {
            setRotating(false);
        }
    };

    const iconButton = "btn-press-sm flex-shrink-0 w-7 h-7 flex items-center justify-center border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))]";

    return (
        <Section icon={<KeyRound size={14} />} title="CLI & extension token" hint="Paste into the CLI, the browser extension or the MCP server. Treat it like a password.">
            <div className="card-flat p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono truncate flex-1 text-[rgb(var(--ink-muted))]">
                        {user?.token ? (revealed ? user.token : mask(user.token)) : "—"}
                    </code>
                    <button onClick={() => setRevealed((r) => !r)} className={iconButton} title={revealed ? "Hide token" : "Show token"} aria-label={revealed ? "Hide token" : "Show token"}>
                        {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                    <button onClick={copy} className={iconButton} title="Copy token" aria-label="Copy token">
                        {copied ? <Check size={11} className="text-brand-500" /> : <Copy size={11} />}
                    </button>
                </div>
                <div className="border-t-2 border-dashed border-[rgb(var(--border))] pt-2 flex items-center justify-between gap-2">
                    <code className="text-[10px] font-mono text-[rgb(var(--ink-muted))]">hagit login -t &lt;token&gt;</code>
                    <button onClick={() => setConfirmRotate(true)} className="flex items-center gap-1 text-[11px] font-bold hover:text-red-600 dark:hover:text-red-400">
                        <RotateCcw size={11} /> Rotate
                    </button>
                </div>
            </div>
            {confirmRotate && (
                <ConfirmDialog
                    title="Rotate your token?"
                    description="This signs out every other browser session, the CLI, the extension and MCP clients. You'll need to paste the new token into each of them."
                    confirmLabel="Rotate token"
                    loading={rotating}
                    onConfirm={rotate}
                    onCancel={() => setConfirmRotate(false)}
                />
            )}
        </Section>
    );
}
