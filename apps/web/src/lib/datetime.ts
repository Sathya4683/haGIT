// Timezone-aware date helpers.
//
// Built on the platform `Intl.DateTimeFormat` — no new deps. Works on Node 20+
// (server) and all modern browsers. The whole point of this module is to give
// every consumer one canonical answer to "which calendar day does this instant
// fall on?" instead of relying on the silent UTC default of `Date`.

const DEFAULT_TZ = "UTC";

/**
 * Returns the user's IANA timezone, e.g. "Asia/Kolkata".
 *
 * Browser-only meaningful — returns "UTC" during SSR / Node. Callers in the
 * server (API routes) should pass an explicit tz instead of relying on this.
 */
export function getUserTimezone(): string {
    if (typeof Intl === "undefined") return DEFAULT_TZ;
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
    } catch {
        return DEFAULT_TZ;
    }
}

// Per-tz formatter cache — constructor is the expensive part, the .format()
// call itself is cheap. One entry per IANA zone per process.
const fmtCache = new Map<string, Intl.DateTimeFormat>();

function getFmt(tz: string): Intl.DateTimeFormat {
    let f = fmtCache.get(tz);
    if (!f) {
        // "en-CA" + 2-digit year/month/day yields "YYYY-MM-DD" reliably.
        f = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        fmtCache.set(tz, f);
    }
    return f;
}

/**
 * Returns the yyyy-MM-dd calendar key for `input` as observed in `tz`.
 *
 * Example: localDayKey("2026-09-03T19:00:00Z", "Asia/Kolkata") === "2026-09-04"
 * (because 19:00 UTC on the 3rd is 00:30 IST on the 4th).
 */
export function localDayKey(input: Date | string, tz: string = DEFAULT_TZ): string {
    const d = typeof input === "string" ? new Date(input) : input;
    return getFmt(tz).format(d);
}

/**
 * Defends against bad `?tz=` query params. Throws from
 * `Intl.DateTimeFormat` for unknown zones — we catch and report false.
 */
export function isValidTimezone(tz: string): boolean {
    try {
        new Intl.DateTimeFormat("en-CA", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}