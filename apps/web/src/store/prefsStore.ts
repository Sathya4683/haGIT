import { create } from "zustand";
import { preferencesApi } from "@/lib/api";
import type { Preferences } from "@/types";

interface PrefsState {
    prefs: Preferences | null;
    load: () => Promise<Preferences | null>;
    update: (patch: Parameters<typeof preferencesApi.update>[0]) => Promise<Preferences>;
}

export const usePrefsStore = create<PrefsState>((set) => ({
    prefs: null,
    load: async () => {
        try {
            const prefs = await preferencesApi.get();
            set({ prefs });
            return prefs;
        } catch {
            return null;
        }
    },
    update: async (patch) => {
        const prefs = await preferencesApi.update(patch);
        set({ prefs });
        return prefs;
    },
}));
