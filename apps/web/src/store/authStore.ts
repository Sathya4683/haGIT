import { create } from "zustand";
import { signOut } from "next-auth/react";
import type { AuthUser } from "@hagit/types";

interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    setUser: (user: AuthUser | null) => void;
    setLoading: (loading: boolean) => void;
    /** Clears the API token and ends the Auth.js session (OAuth users). */
    logout: () => Promise<void>;
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

    logout: async () => {
        localStorage.removeItem("hagit_token");
        localStorage.removeItem("hagit_user");
        set({ user: null });
        // Without this the dashboard's session bridge would silently sign OAuth users back in.
        await signOut({ redirect: false }).catch(() => undefined);
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
