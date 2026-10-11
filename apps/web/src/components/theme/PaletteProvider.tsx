"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_PALETTE, isPaletteId, PALETTE_STORAGE_KEY } from "@/lib/palettes";

interface PaletteContextValue {
    palette: string;
    /** Applies a palette locally. Persisting it to the account is the caller's job. */
    setPalette: (id: string) => void;
}

const PaletteContext = createContext<PaletteContextValue>({ palette: DEFAULT_PALETTE, setPalette: () => {} });

function apply(id: string) {
    document.documentElement.setAttribute("data-palette", id);
    try {
        localStorage.setItem(PALETTE_STORAGE_KEY, id);
    } catch {
        /* storage unavailable */
    }
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
    const [palette, setState] = useState(DEFAULT_PALETTE);

    useEffect(() => {
        const current = document.documentElement.getAttribute("data-palette");
        if (isPaletteId(current)) setState(current);
    }, []);

    const setPalette = useCallback((id: string) => {
        if (!isPaletteId(id)) return;
        apply(id);
        setState(id);
    }, []);

    return <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>;
}

export const usePalette = () => useContext(PaletteContext);
