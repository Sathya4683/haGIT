// Pure habit statistics — no I/O, no LLM. Every number the coach quotes is
// computed here so the model only interprets, never counts.
//
// Days are calendar days in the user's timezone, keyed "yyyy-MM-dd", using the
// same Intl approach as apps/web/src/lib/datetime.ts.

import type { CheckIn } from "./data";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const DAY_MS = 86_400_000;
// A weekday pattern from a handful of days is noise, not a pattern.
const MIN_DAYS_FOR_WEEKDAY_PATTERN = 7;

const dayFmtCache = new Map<string, Intl.DateTimeFormat>();
const timeFmtCache = new Map<string, Intl.DateTimeFormat>();

function cached(cache: Map<string, Intl.DateTimeFormat>, tz: string, make: () => Intl.DateTimeFormat) {
    let f = cache.get(tz);
    if (!f) {
        f = make();
        cache.set(tz, f);
    }
    return f;
}

/** yyyy-MM-dd calendar key for `input` as observed in `tz`. */
export function dayKey(input: Date | string, tz: string): string {
    const d = typeof input === "string" ? new Date(input) : input;
    return cached(dayFmtCache, tz, () =>
        new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }),
    ).format(d);
}

/** Local "HH:mm" (24h) of `input` in `tz`. */
export function localTime(input: Date | string, tz: string): string {
    const d = typeof input === "string" ? new Date(input) : input;
    return cached(timeFmtCache, tz, () =>
        new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    ).format(d);
}

/** Local hour (0-23) of `input` in `tz`. */
export function localHour(input: Date | string, tz: string): number {
    return Number(localTime(input, tz).slice(0, 2)) % 24;
}

const keyMs = (key: string) => Date.parse(`${key}T00:00:00Z`);

export function addDays(key: string, n: number): string {
    return new Date(keyMs(key) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
    return Math.round((keyMs(to) - keyMs(from)) / DAY_MS);
}

export function weekdayOf(key: string): Weekday {
    // getUTCDay: 0 = Sunday. WEEKDAYS starts on Monday.
    return WEEKDAYS[(new Date(keyMs(key)).getUTCDay() + 6) % 7];
}

/** Consecutive active days ending today — or yesterday, since today isn't over yet. */
export function currentStreak(days: Set<string>, today: string): number {
    let cursor = days.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (days.has(cursor)) {
        streak++;
        cursor = addDays(cursor, -1);
    }
    return streak;
}

export function longestStreak(days: Set<string>): number {
    // Array.from / forEach rather than spreading: apps/web type-checks this
    // source with a pre-ES2015 target, where Sets aren't iterable.
    const sorted = Array.from(days).sort();
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const key of sorted) {
        run = prev !== null && daysBetween(prev, key) === 1 ? run + 1 : 1;
        best = Math.max(best, run);
        prev = key;
    }
    return best;
}

/** Number of active days in the `length` days ending `endOffset` days before today. */
function activeDaysIn(days: Set<string>, today: string, length: number, endOffset = 0): number {
    let count = 0;
    for (let i = endOffset; i < endOffset + length; i++) {
        if (days.has(addDays(today, -i))) count++;
    }
    return count;
}

export interface HabitStats {
    habit: string;
    totalCheckIns: number;
    activeDaysAllTime: number;
    firstCheckIn: string | null;
    lastCheckIn: string | null;
    daysSinceLast: number | null;
    currentStreak: number;
    longestStreak: number;
    window: {
        days: number;
        activeDays: number;
        checkIns: number;
        /** Active days / days the habit existed within the window. */
        consistencyPct: number;
    };
    last7Days: number;
    previous7Days: number;
    trend: "up" | "down" | "flat";
    activeDaysByWeekday: Record<Weekday, number>;
    strongestWeekday: Weekday | null;
    weakestWeekday: Weekday | null;
    /** Local hour (0-23) with the most check-ins. */
    typicalHour: number | null;
}

export interface StatsOptions {
    tz: string;
    now?: Date;
    windowDays?: number;
    /** Habit creation time — counts as the start if it predates the first check-in. */
    createdAt?: string;
}

/** Stats for one habit. `checkIns` must already be filtered to that habit. */
export function computeHabitStats(habit: string, checkIns: CheckIn[], opts: StatsOptions): HabitStats {
    const { tz, windowDays = 30 } = opts;
    const today = dayKey(opts.now ?? new Date(), tz);

    // Future-dated check-ins (clock skew, manual timestamps) would break the windows.
    const past = checkIns.filter((c) => dayKey(c.timestamp, tz) <= today);
    const days = new Set(past.map((c) => dayKey(c.timestamp, tz)));
    const sortedDays = Array.from(days).sort();
    const first = sortedDays[0] ?? null;
    const last = sortedDays[sortedDays.length - 1] ?? null;

    // Don't penalise a habit started 3 days ago for the other 27 days of a 30-day window.
    const createdKey = opts.createdAt ? dayKey(opts.createdAt, tz) : null;
    const start = [first, createdKey].filter((k): k is string => k !== null).sort()[0];
    const effectiveWindow = start
        ? Math.max(1, Math.min(windowDays, daysBetween(start, today) + 1))
        : windowDays;

    const windowStart = addDays(today, -(windowDays - 1));
    const windowActive = activeDaysIn(days, today, windowDays);
    const windowCheckIns = past.filter((c) => dayKey(c.timestamp, tz) >= windowStart).length;

    const last7 = activeDaysIn(days, today, 7);
    const previous7 = activeDaysIn(days, today, 7, 7);

    const byWeekday = Object.fromEntries(WEEKDAYS.map((d) => [d, 0])) as Record<Weekday, number>;
    days.forEach((key) => { byWeekday[weekdayOf(key)]++; });
    let strongest: Weekday | null = null;
    let weakest: Weekday | null = null;
    if (days.size >= MIN_DAYS_FOR_WEEKDAY_PATTERN) {
        strongest = WEEKDAYS.reduce((a, b) => (byWeekday[b] > byWeekday[a] ? b : a));
        weakest = WEEKDAYS.reduce((a, b) => (byWeekday[b] < byWeekday[a] ? b : a));
    }

    const hourCounts = new Array<number>(24).fill(0);
    for (const c of past) hourCounts[localHour(c.timestamp, tz)]++;
    const peak = Math.max(...hourCounts);

    return {
        habit,
        totalCheckIns: past.length,
        activeDaysAllTime: days.size,
        firstCheckIn: first,
        lastCheckIn: last,
        daysSinceLast: last ? daysBetween(last, today) : null,
        currentStreak: currentStreak(days, today),
        longestStreak: longestStreak(days),
        window: {
            days: windowDays,
            activeDays: windowActive,
            checkIns: windowCheckIns,
            consistencyPct: Math.round((windowActive / effectiveWindow) * 100),
        },
        last7Days: last7,
        previous7Days: previous7,
        trend: last7 > previous7 ? "up" : last7 < previous7 ? "down" : "flat",
        activeDaysByWeekday: byWeekday,
        strongestWeekday: strongest,
        weakestWeekday: weakest,
        typicalHour: peak > 0 ? hourCounts.indexOf(peak) : null,
    };
}
