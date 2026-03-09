import { create } from "zustand";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => {
    if (user) {
      localStorage.setItem("hagit_token", user.token);
      localStorage.setItem("hagit_user", JSON.stringify(user));
    }
    set({ user });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  logout: () => {
    localStorage.removeItem("hagit_token");
    localStorage.removeItem("hagit_user");
    set({ user: null });
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem("hagit_user");
      if (raw) {
        const user = JSON.parse(raw) as AuthUser;
        set({ user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
