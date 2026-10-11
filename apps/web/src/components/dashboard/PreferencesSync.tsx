"use client";

import { useEffect } from "react";
import { getUserTimezone } from "@/lib/datetime";
import { usePrefsStore } from "@/store/prefsStore";
import { usePalette } from "@/components/theme/PaletteProvider";

/**
 * Loads account preferences once per dashboard visit: applies the saved palette (so it follows
 * the account across devices) and keeps the stored timezone in step with the browser, which the
 * nightly reminder and weekly report rely on.
 */
export function PreferencesSync() {
    const load = usePrefsStore((s) => s.load);
    const update = usePrefsStore((s) => s.update);
    const { setPalette } = usePalette();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const prefs = await load();
            if (!prefs || cancelled) return;
            setPalette(prefs.palette);
            const tz = getUserTimezone();
            if (tz && tz !== prefs.timezone) update({ timezone: tz }).catch(() => undefined);
        })();
        return () => {
            cancelled = true;
        };
    }, [load, update, setPalette]);

    return null;
}
