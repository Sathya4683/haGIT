// Habit identity colours. Each habit keeps one categorical slot (by creation order) everywhere
// it appears: cards, the activity graph, chart segments. Values live in globals.css as
// --series-1…8 (with dark-mode steps).

export const SERIES_COUNT = 8;

/** CSS colour for a slot, optionally with alpha. */
export function seriesColor(slot: number, alpha?: number) {
    const v = `var(--series-${(slot % SERIES_COUNT) + 1})`;
    return alpha === undefined ? `rgb(${v})` : `rgb(${v} / ${alpha})`;
}

/** Slot per habit id, assigned in creation order. */
export function habitSlots<T extends { id: number; createdAt?: string }>(habits: T[]): Map<number, number> {
    const ordered = [...habits].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id - b.id);
    return new Map(ordered.map((h, i) => [h.id, i % SERIES_COUNT]));
}
