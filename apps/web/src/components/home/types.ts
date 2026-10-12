import type { CommitByHabit } from "@/types";

/** A habit with its identity colour, as rendered across the dashboard. */
export interface HabitView extends CommitByHabit {
    slot: number;
    color: string;
}
