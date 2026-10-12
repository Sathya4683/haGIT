import { create } from "zustand";

export type SettingsTab = "appearance" | "reminders" | "account";

interface UiState {
    coachOpen: boolean;
    settingsOpen: boolean;
    settingsTab: SettingsTab;
    /** Prefilled coach question (from library links or suggestions). */
    coachDraft: string;
    setCoachOpen: (open: boolean) => void;
    openCoachWith: (question: string) => void;
    setSettingsOpen: (open: boolean, tab?: SettingsTab) => void;
    setSettingsTab: (tab: SettingsTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
    coachOpen: false,
    settingsOpen: false,
    settingsTab: "appearance",
    coachDraft: "",
    setCoachOpen: (coachOpen) => set({ coachOpen, ...(coachOpen && { settingsOpen: false }) }),
    openCoachWith: (coachDraft) => set({ coachOpen: true, coachDraft, settingsOpen: false }),
    setSettingsOpen: (settingsOpen, tab) => set({ settingsOpen, ...(tab && { settingsTab: tab }), ...(settingsOpen && { coachOpen: false }) }),
    setSettingsTab: (settingsTab) => set({ settingsTab }),
}));
