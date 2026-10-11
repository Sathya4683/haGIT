// Batches log lines and ships them to Loki's push API. Disabled unless LOKI_URL is set.
// Lines are flushed after the response is sent (see withRoute), so logging never adds latency.

type Labels = Record<string, string>;

interface Entry {
    labels: Labels;
    tsNs: string;
    line: string;
}

const MAX_BUFFER = 500;
const PUSH_TIMEOUT_MS = 3_000;

let buffer: Entry[] = [];

export function lokiEnabled() {
    return Boolean(process.env.LOKI_URL);
}

export function enqueue(labels: Labels, line: string, at = Date.now()) {
    if (!lokiEnabled()) return;
    if (buffer.length >= MAX_BUFFER) buffer.shift();
    buffer.push({ labels, tsNs: `${at}000000`, line });
}

function authHeader(): Record<string, string> {
    const user = process.env.LOKI_USERNAME;
    const pass = process.env.LOKI_PASSWORD;
    if (!user || !pass) return {};
    return { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` };
}

export function toPushBody(entries: Entry[]) {
    const streams = new Map<string, { stream: Labels; values: [string, string][] }>();
    for (const e of entries) {
        const key = JSON.stringify(e.labels);
        let s = streams.get(key);
        if (!s) {
            s = { stream: e.labels, values: [] };
            streams.set(key, s);
        }
        s.values.push([e.tsNs, e.line]);
    }
    return { streams: Array.from(streams.values()) };
}

/** Sends everything buffered so far. Never throws: losing log lines must not fail requests. */
export async function flush(): Promise<void> {
    const url = process.env.LOKI_URL;
    if (!url || buffer.length === 0) return;
    const entries = buffer;
    buffer = [];
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader() },
            body: JSON.stringify(toPushBody(entries)),
            signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
        });
        if (!res.ok) console.error(`[loki] push failed with ${res.status}`);
    } catch (e) {
        console.error("[loki] push failed:", (e as Error).message);
    }
}
