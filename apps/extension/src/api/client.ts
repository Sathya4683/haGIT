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

// Build Axios instance dynamically so it picks up baseURL changes
function client() {
    return axios.create({
        baseURL,
        headers: { "Content-Type": "application/json" },
        timeout: 10_000,
    });
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
    const err = e as AxiosError<{ error?: string }>;
    return err.response?.data?.error ?? err.message ?? "Unknown error";
}

// ── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
    verify: async (token: string, url?: string): Promise<AuthUser> => {
        const base = url?.replace(/\/$/, "") ?? baseURL;
        const res = await axios.post<{ userId: number; email: string }>(
            `${base}/api/auth/verify`,
            {},
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
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
    push: async (habitName: string, message: string): Promise<void> => {
        try {
            const ax = await withAuth();
            await ax.post("/api/commits/push", {
                commits: [{ habitName, message, timestamp: new Date().toISOString() }],
            });
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
