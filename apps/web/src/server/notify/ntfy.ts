import { ntfyServerUrl } from "@/server/prefs";

export interface NtfyAction {
    action: "view";
    label: string;
    url: string;
    clear?: boolean;
}

export interface NtfyMessage {
    topic: string;
    title: string;
    message: string;
    /** Emoji shortcodes / tags, e.g. ["crescent_moon"]. */
    tags?: string[];
    /** 1 (min) … 5 (max); 3 is the default. */
    priority?: 1 | 2 | 3 | 4 | 5;
    click?: string;
    actions?: NtfyAction[];
}

/** Publishes a notification via ntfy's JSON API (UTF-8 safe, unlike header-based publishing). */
export async function publishNtfy(msg: NtfyMessage): Promise<void> {
    const token = process.env.NTFY_TOKEN;
    const res = await fetch(ntfyServerUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(msg),
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`ntfy responded ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
}
