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

// ── Zoned calendar arithmetic (server-side; no dependencies) ───────────────

const partsFmtCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFmt(tz: string): Intl.DateTimeFormat {
    let f = partsFmtCache.get(tz);
    if (!f) {
        f = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hourCycle: "h23",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            weekday: "short",
        });
        partsFmtCache.set(tz, f);
    }
    return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ZonedParts {
    /** yyyy-MM-dd */
    dateKey: string;
    hour: number;
    minute: number;
    /** 0 = Sunday … 6 = Saturday */
    weekday: number;
}

/** Calendar fields of `at` as observed in `tz`. */
export function zonedParts(at: Date, tz: string): ZonedParts {
    const parts = getPartsFmt(tz).formatToParts(at);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    return {
        dateKey: `${get("year")}-${get("month")}-${get("day")}`,
        hour: Number(get("hour")),
        minute: Number(get("minute")),
        weekday: WEEKDAYS.indexOf(get("weekday")),
    };
}

/** Offset of `tz` from UTC at instant `at`, in milliseconds (e.g. +05:30 → 19_800_000). */
function tzOffsetMs(at: number, tz: string): number {
    const parts = getPartsFmt(tz).formatToParts(new Date(at));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return asUtc - Math.floor(at / 1000) * 1000;
}

/** Adds whole days to a yyyy-MM-dd key. */
export function addDaysToKey(dateKey: string, days: number): string {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The UTC instant at which local midnight of `dateKey` occurs in `tz`. */
export function zonedStartOfDay(dateKey: string, tz: string): Date {
    const [y, m, d] = dateKey.split("-").map(Number);
    const guess = Date.UTC(y, m - 1, d);
    let start = guess - tzOffsetMs(guess, tz);
    // Second pass corrects for an offset change (DST) between the guess and local midnight.
    start = guess - tzOffsetMs(start, tz);
    return new Date(start);
}

/** Half-open UTC range [start, end) covering the local calendar day `dateKey` in `tz`. */
export function zonedDayRange(dateKey: string, tz: string): { start: Date; end: Date } {
    return { start: zonedStartOfDay(dateKey, tz), end: zonedStartOfDay(addDaysToKey(dateKey, 1), tz) };
}

/** ISO-8601 week key ("2026-W41") of a yyyy-MM-dd date. Weeks start on Monday. */
export function isoWeekKey(dateKey: string): string {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const weekday = date.getUTCDay() || 7; // Monday = 1 … Sunday = 7
    date.setUTCDate(date.getUTCDate() + 4 - weekday); // the week's Thursday decides its year
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
