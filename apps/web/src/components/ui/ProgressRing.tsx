"use client";

import { useEffect, useState } from "react";

interface Props {
    value: number;
    max: number;
    size?: number;
    stroke?: number;
    /** CSS colour of the filled arc. */
    color?: string;
    label?: string;
    children?: React.ReactNode;
}

/** Circular progress (animates on change). */
export function ProgressRing({ value, max, size = 96, stroke = 10, color = "rgb(var(--brand-500))", label, children }: Props) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const ratio = max > 0 ? Math.min(1, value / max) : 0;
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const id = requestAnimationFrame(() => setShown(ratio));
        return () => cancelAnimationFrame(id);
    }, [ratio]);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value} of ${max}`}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--paper-alt))" strokeWidth={stroke} />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - shown)}
                    style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
        </div>
    );
}
