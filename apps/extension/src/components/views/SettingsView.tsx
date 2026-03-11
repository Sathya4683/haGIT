import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { ExternalLink, LogOut, CheckCircle2, Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const PRODUCTION_URL = "https://hagithub.vercel.app";

export function SettingsView() {
    const { user, baseURL, login, logout, error, setError } = useAuthStore();
    const [token, setToken] = useState("");
    const [url, setUrl] = useState(baseURL || PRODUCTION_URL);
    const [loading, setLoading] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleLogin = async () => {
        if (!token.trim()) return;
        setLoading(true);
        try {
            await login(token.trim(), url.trim());
            toast.success("Connected to haGIT.");
            setToken("");
        } catch {
            // error is set inside the store
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        setShowLogout(false);
        setError(null);
        toast.success("Signed out.");
    };

    const copyToken = () => {
        if (!user?.token) return;
        navigator.clipboard.writeText(user.token).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ── Connected state ──────────────────────────────────────────────────────
    if (user) {
        return (
            <div className="flex flex-col gap-0 animate-fade-in">

                {/* Connected banner */}
                <div className="border-b-2 border-[rgb(var(--border))] p-4 bg-[rgb(var(--card-bg))]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-0.5 w-6 bg-brand-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                            Connected
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-500 border-2 border-[rgb(var(--border))] flex items-center justify-center flex-shrink-0 shadow-brutal-sm">
                            <CheckCircle2 size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-sm truncate">{user.email}</p>
                            <a
                                href={baseURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-mono text-brand-700 hover:text-brand-600 transition-colors mt-0.5 truncate"
                            >
                                <ExternalLink size={9} className="flex-shrink-0" />
                                {baseURL}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Token */}
                <div className="border-b-2 border-[rgb(var(--border))] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                            CLI Token
                        </p>
                        <button
                            onClick={copyToken}
                            className="btn-press-sm flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-wider border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all"
                        >
                            {copied
                                ? <><Check size={9} className="text-brand-500" /> Copied</>
                                : <><Copy size={9} /> Copy</>}
                        </button>
                    </div>
                    <div className="card-flat p-2.5 cursor-pointer" onClick={copyToken}>
                        <code className="text-[10px] font-mono text-[rgb(var(--ink-muted))] break-all select-all leading-relaxed">
                            {user.token}
                        </code>
                    </div>
                    <p className="text-[10px] text-[rgb(var(--ink-muted))] mt-2 leading-relaxed">
                        CLI: <code className="font-mono">hagit login -t &lt;token&gt;</code>
                    </p>
                </div>

                {/* Open dashboard */}
                <div className="border-b-2 border-[rgb(var(--border))] px-4 py-3">
                    <a
                        href={baseURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-press-sm flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold border-2 border-[rgb(var(--border))] hover:bg-[rgb(var(--paper-alt))] transition-all"
                    >
                        <ExternalLink size={11} />
                        Open haGIT dashboard
                    </a>
                </div>

                {/* Sign out */}
                <div className="px-4 py-3">
                    <button
                        onClick={() => setShowLogout(true)}
                        className="btn-press-sm w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-red-600 border-2 border-red-300 hover:bg-red-50 transition-all"
                    >
                        <LogOut size={12} />
                        Sign out
                    </button>
                </div>

                {showLogout && (
                    <ConfirmDialog
                        title="Sign out of haGIT?"
                        description="You'll need to paste your token again to reconnect."
                        confirmLabel="Sign out"
                        onConfirm={handleLogout}
                        onCancel={() => setShowLogout(false)}
                    />
                )}
            </div>
        );
    }

    // ── Login / connect form ─────────────────────────────────────────────────
    return (
        <div className="p-4 space-y-4 animate-slide-up">
            <div>
                <div className="h-0.5 w-6 bg-brand-500 mb-3" />
                <h2 className="font-black text-base">Connect to haGIT</h2>
                <p className="text-xs text-[rgb(var(--ink-muted))] mt-1 leading-relaxed">
                    Get your token from the web dashboard &rarr; Settings gear &rarr; CLI Token.
                </p>
            </div>

            {/* Dashboard link */}
            <a
                href={PRODUCTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2.5 card-flat text-xs font-bold text-brand-700 hover:bg-[rgb(var(--paper-alt))] transition-colors group"
            >
                <ExternalLink size={11} className="flex-shrink-0" />
                <span className="truncate">{PRODUCTION_URL}</span>
                <span className="ml-auto text-[rgb(var(--ink-muted))] text-[10px] font-mono group-hover:text-brand-600">open &rarr;</span>
            </a>

            {/* Token input */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">
                    JWT Token
                </label>
                <textarea
                    value={token}
                    onChange={(e) => { setToken(e.target.value); setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleLogin(); } }}
                    placeholder="Paste your token here..."
                    rows={4}
                    className="input-brutal w-full px-3 py-2 text-[10px] font-mono resize-none leading-relaxed"
                />
            </div>

            {/* Advanced: custom server URL */}
            <details className="group">
                <summary className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))] cursor-pointer hover:text-[rgb(var(--ink))] transition-colors select-none list-none flex items-center gap-1.5">
                    <span className="group-open:rotate-90 transition-transform inline-block text-[8px]">&#9654;</span>
                    Custom server URL
                </summary>
                <div className="mt-2 space-y-1.5">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://hagithub.vercel.app"
                        className="input-brutal w-full px-3 py-2 text-[10px] font-mono"
                    />
                    <p className="text-[10px] text-[rgb(var(--ink-muted))]">
                        Only change this if you are self-hosting haGIT.
                    </p>
                </div>
            </details>

            {error && (
                <div className="status-strip-error px-3 py-2">
                    <p className="text-xs font-bold text-red-700">{error}</p>
                </div>
            )}

            <button
                onClick={handleLogin}
                disabled={loading || !token.trim()}
                className={cn(
                    "btn-press w-full py-2.5 text-xs font-black uppercase tracking-wider",
                    "bg-[rgb(var(--border))] text-[rgb(var(--paper))]",
                    "border-2 border-[rgb(var(--border))] shadow-brutal",
                    "transition-all disabled:opacity-50"
                )}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-1.5">
                        <Spinner className="border-white/30 border-t-white" />
                        Verifying token
                    </span>
                ) : "Verify & Connect \u2192"}
            </button>
        </div>
    );
}
