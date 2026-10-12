// Structured JSON logger. Every line goes to stdout (visible in the Vercel log viewer) and,
// when LOKI_URL is configured, to Loki. Never log habit names, commit messages or secrets.

import { enqueue, flush } from "./loki";

export type Level = "debug" | "info" | "warn" | "error";
export type Fields = Record<string, unknown>;

/** Loki stream labels: keep these few and low-cardinality. Everything else goes in the line. */
export type Kind = "http" | "job" | "coach" | "telemetry" | "app";
export type Source = "server" | "cli" | "extension" | "web" | "mcp";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const REDACTED_KEYS = new Set(["password", "token", "authorization", "secret", "cookie"]);

function minLevel(): number {
    const configured = process.env.LOG_LEVEL as Level | undefined;
    return LEVELS[configured && configured in LEVELS ? configured : "info"];
}

function serializeError(err: unknown) {
    if (err instanceof Error) {
        return { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6).join("\n") };
    }
    return { message: String(err) };
}

function clean(fields: Fields): Fields {
    const out: Fields = {};
    for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;
        if (REDACTED_KEYS.has(k.toLowerCase())) continue;
        out[k] = k === "err" ? serializeError(v) : v;
    }
    return out;
}

export interface Logger {
    debug(msg: string, fields?: Fields): void;
    info(msg: string, fields?: Fields): void;
    warn(msg: string, fields?: Fields): void;
    error(msg: string, fields?: Fields): void;
    child(fields: Fields): Logger;
}

interface LoggerOptions {
    kind: Kind;
    source: Source;
    base: Fields;
}

function createLogger({ kind, source, base }: LoggerOptions): Logger {
    const service = "hagit-web";
    const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

    const write = (level: Level, msg: string, fields: Fields = {}) => {
        if (LEVELS[level] < minLevel()) return;
        const now = Date.now();
        const line = JSON.stringify({ ts: new Date(now).toISOString(), level, msg, ...clean({ ...base, ...fields }) });
        if (level === "error") console.error(line);
        else if (level === "warn") console.warn(line);
        else console.log(line);
        enqueue({ service, env, kind, source, level }, line, now);
    };

    return {
        debug: (msg, fields) => write("debug", msg, fields),
        info: (msg, fields) => write("info", msg, fields),
        warn: (msg, fields) => write("warn", msg, fields),
        error: (msg, fields) => write("error", msg, fields),
        child: (fields) => createLogger({ kind, source, base: { ...base, ...fields } }),
    };
}

export function getLogger(kind: Kind = "app", source: Source = "server"): Logger {
    return createLogger({ kind, source, base: {} });
}

export const flushLogs = flush;
