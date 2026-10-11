import axios, { AxiosError } from "axios";
import { storage, STORAGE_KEYS } from "./storage";
import type { AuthUser, Habit, HabitDetail, Commit } from "@hagit/types";

const DEFAULT_BASE_URL = "https://hagithub.vercel.app";
let baseURL = DEFAULT_BASE_URL;

// Load saved base URL from storage at module init
storage.get<string>(STORAGE_KEYS.BASE_URL).then((saved) => {
    if (saved) baseURL = saved;
});

export function getBaseURL(): string {
    return baseURL;
}

export function setBaseURL(url: string): void {
    baseURL = url.replace(/\/$/, "");
    storage.set(STORAGE_KEYS.BASE_URL, baseURL);
}

/** Updates the in-memory base URL without persisting it (used when hydrating from storage). */
export function applyBaseURL(url: string): void {
    baseURL = url.replace(/\/$/, "");
}

const CLIENT_HEADER = `hagit-extension/${typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : "dev"}`;

let unauthorizedHandler: (() => void) | null = null;

/** Called when the server rejects the stored token (expired, rotated or revoked). */
export function onUnauthorized(handler: () => void) {
    unauthorizedHandler = handler;
}

// Build Axios instance dynamically so it picks up baseURL changes
function client(base = baseURL) {
    const ax = axios.create({
        baseURL: base,
        headers: { "Content-Type": "application/json", "X-Hagit-Client": CLIENT_HEADER },
        timeout: 10_000,
    });
    ax.interceptors.response.use(undefined, (error: AxiosError) => {
        if (error.response?.status === 401) unauthorizedHandler?.();
        return Promise.reject(error);
    });
    return ax;
}

async function withAuth() {
    const token = await storage.get<string>(STORAGE_KEYS.TOKEN);
    const ax = client();
    if (token) {
        ax.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    return ax;
}

function extractError(e: unknown): string {
    const err = e as AxiosError<{ error?: string; retryAfter?: number }>;
    if (err.response?.status === 401) return "Your token expired. Paste a new one from the dashboard.";
    if (err.response?.status === 429 && err.response.data?.retryAfter) {
        return `Too many requests. Try again in ${err.response.data.retryAfter}s.`;
    }
    return err.response?.data?.error ?? err.message ?? "Unknown error";
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
    verify: async (token: string, url?: string): Promise<AuthUser> => {
        const base = url?.trim() ? url.trim().replace(/\/$/, "") : baseURL;
        // A plain instance: a 401 here means "wrong token", not "log the current user out".
        const res = await axios.post<{ userId: number; email: string }>(
            `${base}/api/auth/verify`,
            {},
            {
                timeout: 10_000,
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Hagit-Client": CLIENT_HEADER },
            }
        );
        return { userId: res.data.userId, email: res.data.email, token };
    },
};

// ── Habits ──────────────────────────────────────────────────────────────────

export const habitsApi = {
    list: async (): Promise<Habit[]> => {
        try {
            const ax = await withAuth();
            const res = await ax.get<Habit[]>("/api/habits");
            return res.data;
        } catch (e) { throw new Error(extractError(e)); }
    },

    get: async (id: number): Promise<HabitDetail> => {
        try {
            const ax = await withAuth();
            const res = await ax.get<HabitDetail>(`/api/habits/${id}`);
            return res.data;
        } catch (e) { throw new Error(extractError(e)); }
    },

    create: async (name: string): Promise<Habit> => {
        try {
            const ax = await withAuth();
            const res = await ax.post<Habit>("/api/habits", { name });
            return res.data;
        } catch (e) { throw new Error(extractError(e)); }
    },

    rename: async (id: number, name: string): Promise<Habit> => {
        try {
            const ax = await withAuth();
            const res = await ax.patch<Habit>(`/api/habits/${id}`, { name });
            return res.data;
        } catch (e) { throw new Error(extractError(e)); }
    },

    delete: async (id: number): Promise<void> => {
        try {
            const ax = await withAuth();
            await ax.delete(`/api/habits/${id}`);
        } catch (e) { throw new Error(extractError(e)); }
    },
};

// ── Commits ─────────────────────────────────────────────────────────────────

export const commitsApi = {
    /** Returns the stored commit. The clientId makes a retried request safe. */
    push: async (habitName: string, message: string): Promise<Commit> => {
        try {
            const ax = await withAuth();
            const res = await ax.post<{ commits: { id: number; habitName: string; message: string; timestamp: string }[] }>(
                "/api/commits/push",
                { commits: [{ habitName, message, timestamp: new Date().toISOString(), clientId: crypto.randomUUID() }] },
            );
            const c = res.data.commits[0];
            return { id: String(c.id), habitName: c.habitName, message: c.message, timestamp: c.timestamp, synced: true };
        } catch (e) { throw new Error(extractError(e)); }
    },

    list: async (params?: { habitName?: string; limit?: number }): Promise<Commit[]> => {
        try {
            const ax = await withAuth();
            const res = await ax.get<Commit[]>("/api/commits", { params });
            return res.data;
        } catch (e) { throw new Error(extractError(e)); }
    },

    delete: async (id: string): Promise<void> => {
        try {
            const ax = await withAuth();
            await ax.delete(`/api/commits/${id}`);
        } catch (e) { throw new Error(extractError(e)); }
    },
};
