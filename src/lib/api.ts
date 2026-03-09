import axios from "axios";
import type {
  AuthUser,
  VerifyResponse,
  Habit,
  HabitDetail,
  Commit,
  AggregatedCommit,
  CommitByHabit,
} from "@/types";

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

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
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
  delete: (id: number) =>
    apiClient.delete<{ success: boolean }>(`/api/habits/${id}`).then((r) => r.data),
};

export const commitsApi = {
  list: (params?: { habitName?: string; limit?: number }) =>
    apiClient.get<Commit[]>("/api/commits", { params }).then((r) => r.data),
  aggregated: () =>
    apiClient.get<AggregatedCommit[]>("/api/commits/aggregated").then((r) => r.data),
  byHabit: () =>
    apiClient.get<CommitByHabit[]>("/api/commits/by-habit").then((r) => r.data),
  push: (habitName: string, message: string) =>
    apiClient
      .post("/api/commits/push", {
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

export const accountApi = {
  delete: () =>
    apiClient.delete<{ success: boolean }>("/api/account").then((r) => r.data),
};
