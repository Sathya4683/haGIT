"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { toast } from "sonner";
import { PALETTES } from "@/lib/palettes";
import { cn } from "@/lib/utils";
import { usePalette } from "@/components/theme/PaletteProvider";
import { usePrefsStore } from "@/store/prefsStore";
import { Section } from "./Section";

const MODES = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
] as const;

const swatch = (rgb: string) => `rgb(${rgb})`;

export function AppearanceSection() {
    const { theme, setTheme } = useTheme();
    const { palette, setPalette } = usePalette();
    const update = usePrefsStore((s) => s.update);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const choosePalette = (id: string) => {
        setPalette(id);
        update({ palette: id }).catch(() => toast.error("Couldn't save your palette."));
    };

    return (
        <Section icon={<Palette size={14} />} title="Theme" hint="Mode and colour palette. Saved to your account.">
            <div className="grid grid-cols-3 border-2 border-[rgb(var(--border))]" role="radiogroup" aria-label="Colour mode">
                {MODES.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id} role="radio" aria-checked={mounted && theme === id} onClick={() => setTheme(id)}
                        className={cn(
                            "flex items-center justify-center gap-1.5 py-2 text-xs font-bold border-r-2 last:border-r-0 border-[rgb(var(--border))] transition-colors",
                            mounted && theme === id ? "bg-ink dark:bg-white text-white dark:text-ink" : "hover:bg-[rgb(var(--paper-alt))]",
                        )}
                    >
                        <Icon size={12} /> {label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Colour palette">
                {PALETTES.map((p) => {
                    const active = palette === p.id;
                    return (
                        <button
                            key={p.id} role="radio" aria-checked={active} onClick={() => choosePalette(p.id)} title={p.label}
                            className={cn("group p-1.5 border-2 text-left transition-transform hover:-translate-y-0.5", active ? "border-[rgb(var(--border))] shadow-brutal-sm" : "border-transparent")}
                        >
                            <div className="relative h-8 flex border-2 border-[rgb(var(--border))]" style={{ background: swatch((p.light ?? { paper: "250 250 247" }).paper) }}>
                                <span className="flex-1" style={{ background: swatch(p.brand[300]) }} />
                                <span className="flex-1" style={{ background: swatch(p.brand[500]) }} />
                                <span className="flex-1" style={{ background: swatch(p.brand[700]) }} />
                                {active && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <Check size={14} strokeWidth={3} className="text-white drop-shadow" />
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-[10px] font-bold truncate">{p.label}</p>
                        </button>
                    );
                })}
            </div>
        </Section>
    );
}
