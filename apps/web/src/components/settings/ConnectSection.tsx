"use client";

import { useState } from "react";
import { Bot, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Section } from "./Section";

type Client = "claude-code" | "desktop" | "cli";

const CLIENTS: { id: Client; label: string }[] = [
    { id: "claude-code", label: "Claude Code" },
    { id: "desktop", label: "Desktop / Cursor" },
    { id: "cli", label: "CLI" },
];

function snippet(client: Client, token: string) {
    if (client === "claude-code") return `claude mcp add hagit -e HAGIT_TOKEN=${token} -- npx -y hagit-mcp`;
    if (client === "cli") return `npm install -g hagit-cli\nhagit init\nhagit login -t ${token}`;
    return JSON.stringify(
        { mcpServers: { hagit: { command: "npx", args: ["-y", "hagit-mcp"], env: { HAGIT_TOKEN: token } } } },
        null,
        2,
    );
}

const HINTS: Record<Client, string> = {
    "claude-code": "Run once in a terminal. Then ask Claude things like “how consistent was I with reading this month?”",
    desktop: "Add to claude_desktop_config.json (Claude Desktop), .cursor/mcp.json (Cursor) or settings.json (Gemini CLI).",
    cli: "Commit from your terminal: hagit commit -m \"read 20 pages\" && hagit push",
};

/** Copy-ready setup for the MCP server and CLI, with the user's token filled in on copy. */
export function ConnectSection() {
    const token = useAuthStore((s) => s.user?.token);
    const [client, setClient] = useState<Client>("claude-code");
    const [copied, setCopied] = useState(false);
    if (!token) return null;

    const masked = `${token.slice(0, 6)}…${token.slice(-4)}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet(client, token));
            setCopied(true);
            toast.success("Copied. It contains your token, so keep it private.");
            setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Couldn't copy to the clipboard.");
        }
    };

    return (
        <Section icon={<Bot size={14} />} title="Connect an AI assistant" hint="Let Claude, Cursor or Gemini read your stats and log check-ins with the haGIT MCP server, or use the CLI.">
            <div className="grid grid-cols-3 border-2 border-[rgb(var(--border))]" role="tablist" aria-label="Client">
                {CLIENTS.map((c) => (
                    <button
                        key={c.id} role="tab" aria-selected={client === c.id} onClick={() => setClient(c.id)}
                        className={cn(
                            "py-1.5 text-[11px] font-bold border-r-2 last:border-r-0 border-[rgb(var(--border))] transition-colors",
                            client === c.id ? "bg-ink text-white dark:bg-white dark:text-ink" : "hover:bg-[rgb(var(--paper-alt))]",
                        )}
                    >
                        {c.label}
                    </button>
                ))}
            </div>
            <div className="relative bg-ink text-white border-2 border-ink">
                <pre className="px-3 py-2.5 pr-10 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all">{snippet(client, masked)}</pre>
                <button
                    onClick={copy} aria-label="Copy with your token"
                    className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10"
                >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
            </div>
            <p className="text-[11px] text-[rgb(var(--ink-muted))]">{HINTS[client]}</p>
        </Section>
    );
}
