"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Burst {
    id: number;
    x: number;
    y: number;
    colors: string[];
    big: boolean;
}

const CelebrateContext = createContext<(origin: { x: number; y: number }, opts?: { colors?: string[]; big?: boolean }) => void>(() => {});

const DEFAULT_COLORS = ["rgb(var(--brand-500))", "rgb(var(--series-2))", "rgb(var(--series-4))", "rgb(var(--series-1))", "rgb(var(--series-5))"];

/** Lightweight confetti bursts for wins (commits, perfect days). Respects reduced motion. */
export function CelebrateProvider({ children }: { children: React.ReactNode }) {
    const [bursts, setBursts] = useState<Burst[]>([]);
    // The portal targets document.body, so it mounts after hydration.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const celebrate = useCallback((origin: { x: number; y: number }, opts: { colors?: string[]; big?: boolean } = {}) => {
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        const id = Date.now() + Math.random();
        setBursts((b) => [...b, { id, ...origin, colors: opts.colors ?? DEFAULT_COLORS, big: Boolean(opts.big) }]);
        setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1300);
    }, []);

    return (
        <CelebrateContext.Provider value={celebrate}>
            {children}
            {mounted &&
                createPortal(
                    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
                        {bursts.map((b) =>
                            Array.from({ length: b.big ? 36 : 16 }, (_, i) => {
                                const angle = (Math.PI * 2 * i) / (b.big ? 36 : 16) + Math.random() * 0.4;
                                const dist = (b.big ? 140 : 70) + Math.random() * (b.big ? 120 : 50);
                                const style = {
                                    left: b.x,
                                    top: b.y,
                                    background: b.colors[i % b.colors.length],
                                    "--dx": `${Math.cos(angle) * dist}px`,
                                    "--dy": `${Math.sin(angle) * dist + (b.big ? 60 : 20)}px`,
                                    "--rot": `${Math.random() * 540 - 270}deg`,
                                    animation: `confetti ${0.8 + Math.random() * 0.4}s cubic-bezier(0.2, 0.8, 0.3, 1) forwards`,
                                } as React.CSSProperties;
                                return <span key={`${b.id}-${i}`} className={`absolute ${i % 3 ? "w-1.5 h-2.5" : "w-2 h-2 rounded-full"}`} style={style} />;
                            }),
                        )}
                    </div>,
                    document.body,
                )}
        </CelebrateContext.Provider>
    );
}

export const useCelebrate = () => useContext(CelebrateContext);

/** Centre of an element, for burst origins. */
export function centreOf(el: Element | null) {
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 3 };
}
