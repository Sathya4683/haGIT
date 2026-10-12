import axios from "axios";
import type {
    VerifyResponse,
    AggregatedCommit,
    CommitByHabit,
    CoachResponse,
    CoachTurn,
    Preferences,
} from "@/types";
import { getUserTimezone } from "@/lib/datetime";

import type {
    AuthUser,
    Habit,
    HabitDetail,
    Commit,
} from "@hagit/types"

// Same-origin — Next.js serves /api/* directly
export const apiClient = axios.create({
    baseURL: "",
    headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("hagit_token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let bridging: Promise<string | null> | null = null;

/**
 * OAuth users can recover from an expired or rotated API token by minting a new one from their
 * Auth.js session. Concurrent 401s share one bridge request.
 */
function refreshFromSession(): Promise<string | null> {
    bridging ??= fetch("/api/auth/session-token")
        .then(async (res) => {
            if (!res.ok) return null;
            const data = (await res.json()) as AuthUser;
            localStorage.setItem("hagit_token", data.token);
            localStorage.setItem("hagit_user", JSON.stringify(data));
            return data.token;
        })
        .catch(() => null)
        .finally(() => {
            bridging = null;
        });
    return bridging;
}

apiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
        const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
        if (error.response?.status === 401 && typeof window !== "undefined") {
            if (config && !config._retried) {
                config._retried = true;
                const token = await refreshFromSession();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                    return apiClient(config);
                }
            }
            localStorage.removeItem("hagit_token");
            localStorage.removeItem("hagit_user");
            window.location.href = "/auth/login";
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    signup: (email: string, password: string) =>
        apiClient.post<AuthUser>("/api/auth/signup", { email, password }).then((r) => r.data),
    login: (email: string, password: string) =>
        apiClient.post<AuthUser>("/api/auth/login", { email, password }).then((r) => r.data),
    verify: () =>
        apiClient.post<VerifyResponse>("/api/auth/verify").then((r) => r.data),
};

export const habitsApi = {
    list: () =>
        apiClient.get<Habit[]>("/api/habits").then((r) => r.data),
    get: (id: number) =>
        apiClient.get<HabitDetail>(`/api/habits/${id}`).then((r) => r.data),
    create: (name: string) =>
        apiClient.post<Habit>("/api/habits", { name }).then((r) => r.data),
    rename: (id: number, name: string) =>
        apiClient.patch<Habit>(`/api/habits/${id}`, { name }).then((r) => r.data),
    delete: (id: number) =>
        apiClient.delete<{ success: boolean }>(`/api/habits/${id}`).then((r) => r.data),
};

export const commitsApi = {
    list: (params?: { habitName?: string; limit?: number }) =>
        apiClient.get<Commit[]>("/api/commits", { params }).then((r) => r.data),
    /** Commits on one local calendar day (yyyy-MM-dd) in the browser's timezone. */
    onDay: (date: string, habitName?: string) =>
        apiClient
            .get<Commit[]>("/api/commits", { params: { date, tz: getUserTimezone(), habitName, limit: 1000 } })
            .then((r) => r.data),
    aggregated: () =>
        apiClient
            .get<AggregatedCommit[]>("/api/commits/aggregated", {
                params: { tz: getUserTimezone() },
            })
            .then((r) => r.data),
    byHabit: () =>
        apiClient
            .get<CommitByHabit[]>("/api/commits/by-habit", { params: { tz: getUserTimezone() } })
            .then((r) => r.data),
    push: (habitName: string, message: string) =>
        apiClient
            .post<{ commits: { id: number; habitName: string; message: string; timestamp: string }[] }>("/api/commits/push", {
                commits: [{ habitName, message, timestamp: new Date().toISOString() }],
            })
            .then((r) => r.data),
    delete: (id: string) =>
        apiClient.delete<{ success: boolean }>(`/api/commits/${id}`).then((r) => r.data),
    deleteByHabit: (habitId: number) =>
        apiClient
            .delete<{ success: boolean; deletedCount: number }>(`/api/commits/by-habit/${habitId}`)
            .then((r) => r.data),
};

export const coachApi = {
    run: (body: { mode: "review" | "ask"; question?: string; previousReview?: string; history?: CoachTurn[] }) =>
        apiClient
            .post<CoachResponse>("/api/coach", { ...body, tz: getUserTimezone() })
            .then((r) => r.data),
};

export const accountApi = {
    delete: () =>
        apiClient.delete<{ success: boolean }>("/api/account").then((r) => r.data),
    /** Revokes every issued API token and returns a fresh one. */
    rotateToken: () =>
        apiClient.post<AuthUser>("/api/account/token").then((r) => r.data),
};

export const preferencesApi = {
    get: () => apiClient.get<Preferences>("/api/me/preferences").then((r) => r.data),
    update: (patch: Partial<Omit<Preferences, "email" | "ntfy">> & { regenerateTopic?: true }) =>
        apiClient.patch<Preferences>("/api/me/preferences", patch).then((r) => r.data),
};

export const notificationsApi = {
    test: () => apiClient.post<{ sent: boolean }>("/api/notifications/test").then((r) => r.data),
};

export const reportsApi = {
    /** Downloads the weekly report PDF through the authenticated client. */
    downloadPdf: async (week: "current" | "last" = "current") => {
        const res = await apiClient.get<Blob>("/api/reports/weekly", { params: { week }, responseType: "blob" });
        const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? "hagit-weekly.pdf";
        const url = URL.createObjectURL(res.data);
        const a = Object.assign(document.createElement("a"), { href: url, download: name });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    emailPreview: () => apiClient.post<{ sent: boolean; to: string }>("/api/reports/weekly/email").then((r) => r.data),
};
