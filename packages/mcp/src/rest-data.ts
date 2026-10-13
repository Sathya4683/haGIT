// HabitData over the existing haGIT REST API, authenticated with the CLI token.

import type { CheckIn, HabitData, KbSnippet, KnowledgeBase } from "@hagit/coach-core";
import { version } from "../package.json";
import { loadConfig } from "./config";

const REQUEST_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 10_000;

interface ApiHabit {
    id: number;
    name: string;
    createdAt: string;
    commitCount: number;
}

interface ApiHabitDetail extends ApiHabit {
    commits: { id: number; message: string; timestamp: string }[];
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { token, apiUrl } = loadConfig();
    let res: Response;
    try {
        res = await fetch(`${apiUrl}${path}`, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "X-Hagit-Client": `hagit-mcp/${version}`,
            },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch {
        throw new Error(`Couldn't reach haGIT at ${apiUrl}.`);
    }
    if (res.status === 401) {
        throw new Error("haGIT rejected the token (it may have expired or been rotated). Copy a fresh one from Settings → Account on the haGIT website.");
    }
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `haGIT API error (${res.status}).`);
    }
    return (await res.json()) as T;
}

export function restHabitData(): HabitData {
    // Go easy on the server: its database pool is small, and an assistant
    // often chains (or parallelises) several tool calls within seconds. So
    // reuse GET responses briefly — in-flight requests included — and never
    // fan out. Any write clears the cache.
    const cache = new Map<string, { at: number; value: Promise<unknown> }>();

    function cachedGet<T>(path: string): Promise<T> {
        const hit = cache.get(path);
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as Promise<T>;
        const value = request<T>(path);
        cache.set(path, { at: Date.now(), value });
        value.catch(() => {
            if (cache.get(path)?.value === value) cache.delete(path); // don't cache failures
        });
        return value;
    }

    const habits = () => cachedGet<ApiHabit[]>("/api/habits");

    return {
        async listHabits() {
            return (await habits()).map(({ name, createdAt, commitCount }) => ({ name, createdAt, commitCount }));
        },

        // GET /api/habits/:id returns a habit's full history (no 1000-row cap
        // like /api/commits). One habit at a time, skipping empty ones.
        async getCheckIns(habit) {
            const wanted = (await habits()).filter((h) => h.commitCount > 0 && (!habit || h.name === habit));
            const checkIns: CheckIn[] = [];
            for (const h of wanted) {
                const detail = await cachedGet<ApiHabitDetail>(`/api/habits/${h.id}`);
                for (const c of detail.commits) {
                    checkIns.push({ habit: detail.name, message: c.message, timestamp: c.timestamp });
                }
            }
            return checkIns;
        },

        async logCheckIn(habit, message) {
            cache.clear();
            const { commits } = await request<{ commits: { habitName: string; message: string; timestamp: string }[] }>(
                "/api/commits/push",
                {
                    method: "POST",
                    body: JSON.stringify({ commits: [{ habitName: habit, message, timestamp: new Date().toISOString() }] }),
                },
            );
            cache.clear(); // reads that started during the push may hold pre-push data
            const [c] = commits;
            return { habit: c.habitName, message: c.message, timestamp: c.timestamp };
        },

        async createHabit(name) {
            cache.clear();
            const habit = await request<ApiHabit>("/api/habits", { method: "POST", body: JSON.stringify({ name }) });
            cache.clear();
            return { name: habit.name, createdAt: habit.createdAt, commitCount: habit.commitCount };
        },
    };
}

/** Knowledge-base search over the public /api/kb/search endpoint. */
export function restKnowledgeBase(): KnowledgeBase {
    return {
        async search(query, opts) {
            const params = new URLSearchParams({ q: query, limit: String(opts?.limit ?? 3) });
            const { results } = await request<{ results: KbSnippet[] }>(`/api/kb/search?${params}`);
            return results;
        },
    };
}
