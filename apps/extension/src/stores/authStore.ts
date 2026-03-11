import { create } from "zustand";
import { storage, STORAGE_KEYS } from "@/api/storage";
import { authApi, setBaseURL, getBaseURL } from "@/api/client";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  baseURL: string;
  isLoading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  login: (token: string, url?: string) => Promise<void>;
  logout: () => Promise<void>;
  setError: (msg: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  baseURL: "https://hagithub.vercel.app",
  isLoading: true,
  error: null,

  hydrate: async () => {
    try {
      const [token, user, savedURL] = await Promise.all([
        storage.get<string>(STORAGE_KEYS.TOKEN),
        storage.get<AuthUser>(STORAGE_KEYS.USER),
        storage.get<string>(STORAGE_KEYS.BASE_URL),
      ]);
      const url = savedURL ?? "https://hagithub.vercel.app";
      setBaseURL(url);
      if (token && user) {
        set({ user, baseURL: url, isLoading: false });
      } else {
        set({ isLoading: false, baseURL: url });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (token: string, url?: string) => {
    set({ error: null });
    const targetURL = (url ?? get().baseURL).replace(/\/$/, "");
    try {
      const user = await authApi.verify(token.trim(), targetURL);
      setBaseURL(targetURL);
      await Promise.all([
        storage.set(STORAGE_KEYS.TOKEN, token.trim()),
        storage.set(STORAGE_KEYS.USER, user),
        storage.set(STORAGE_KEYS.BASE_URL, targetURL),
      ]);
      set({ user, baseURL: targetURL, error: null });
    } catch {
      set({ error: "Invalid token or server unreachable. Check the URL and try again." });
      throw new Error("Auth failed");
    }
  },

  logout: async () => {
    await Promise.all([
      storage.remove(STORAGE_KEYS.TOKEN),
      storage.remove(STORAGE_KEYS.USER),
    ]);
    set({ user: null });
  },

  setError: (msg) => set({ error: msg }),
}));
