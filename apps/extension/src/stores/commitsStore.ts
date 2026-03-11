import { create } from "zustand";
import { commitsApi } from "@/api/client";
import type { Commit } from "@/types";

interface CommitsState {
  commits: Commit[];
  loading: boolean;
  pushing: boolean;
  error: string | null;
  filter: string | null; // habitName filter

  fetch: (habitName?: string) => Promise<void>;
  push: (habitName: string, message: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setFilter: (habitName: string | null) => void;
}

export const useCommitsStore = create<CommitsState>((set, get) => ({
  commits: [],
  loading: false,
  pushing: false,
  error: null,
  filter: null,

  fetch: async (habitName?: string) => {
    set({ loading: true, error: null });
    try {
      const commits = await commitsApi.list({
        habitName: habitName ?? get().filter ?? undefined,
        limit: 30,
      });
      set({ commits, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  push: async (habitName: string, message: string) => {
    set({ pushing: true, error: null });
    try {
      await commitsApi.push(habitName, message);
      // Optimistic update: prepend to list
      const optimistic: Commit = {
        id: `opt-${Date.now()}`,
        habitName,
        message,
        timestamp: new Date().toISOString(),
        synced: true,
      };
      set((s) => ({
        commits: [optimistic, ...s.commits].slice(0, 30),
        pushing: false,
      }));
      // Refetch to get real ID
      setTimeout(() => get().fetch(habitName), 600);
    } catch (e) {
      set({ pushing: false, error: (e as Error).message });
      throw e;
    }
  },

  remove: async (id: string) => {
    // Optimistic remove
    set((s) => ({ commits: s.commits.filter((c) => c.id !== id) }));
    try {
      await commitsApi.delete(id);
    } catch (e) {
      // Rollback: re-fetch
      get().fetch();
      throw e;
    }
  },

  setFilter: (habitName) => {
    set({ filter: habitName });
    get().fetch(habitName ?? undefined);
  },
}));
