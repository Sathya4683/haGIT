import { create } from "zustand";
import { habitsApi } from "@/api/client";
import { storage, STORAGE_KEYS } from "@/api/storage";
import type { Habit } from "@/types";

interface HabitsState {
  habits: Habit[];
  selectedHabit: Habit | null;
  loading: boolean;
  error: string | null;

  fetch: () => Promise<void>;
  create: (name: string) => Promise<Habit>;
  rename: (id: number, name: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  select: (habit: Habit | null) => void;
  hydrateSelection: () => Promise<void>;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  selectedHabit: null,
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const habits = await habitsApi.list();
      set({ habits, loading: false });
      // Restore last selected habit if still exists
      const { selectedHabit } = get();
      if (selectedHabit) {
        const still = habits.find((h) => h.id === selectedHabit.id);
        set({ selectedHabit: still ?? (habits[0] ?? null) });
      } else if (habits.length > 0 && !selectedHabit) {
        // Auto-select saved last habit or first
        const savedId = await storage.get<number>(STORAGE_KEYS.LAST_HABIT);
        const found = savedId ? habits.find((h) => h.id === savedId) : null;
        set({ selectedHabit: found ?? habits[0] });
      }
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  create: async (name: string) => {
    const habit = await habitsApi.create(name);
    set((s) => ({ habits: [...s.habits, { ...habit, commitCount: 0 }] }));
    return habit;
  },

  rename: async (id: number, name: string) => {
    await habitsApi.rename(id, name);
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, name } : h)),
      selectedHabit: s.selectedHabit?.id === id ? { ...s.selectedHabit, name } : s.selectedHabit,
    }));
  },

  remove: async (id: number) => {
    await habitsApi.delete(id);
    set((s) => {
      const habits = s.habits.filter((h) => h.id !== id);
      const selectedHabit =
        s.selectedHabit?.id === id ? (habits[0] ?? null) : s.selectedHabit;
      return { habits, selectedHabit };
    });
  },

  select: (habit) => {
    set({ selectedHabit: habit });
    if (habit) storage.set(STORAGE_KEYS.LAST_HABIT, habit.id);
  },

  hydrateSelection: async () => {
    const savedId = await storage.get<number>(STORAGE_KEYS.LAST_HABIT);
    if (savedId) {
      const found = get().habits.find((h) => h.id === savedId);
      if (found) set({ selectedHabit: found });
    }
  },
}));
