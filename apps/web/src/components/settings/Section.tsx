export function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--ink-muted))]">{title}</p>
                {hint && <p className="text-[11px] text-[rgb(var(--ink-muted))] mt-0.5">{hint}</p>}
            </div>
            {children}
        </section>
    );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <button
            type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative w-10 h-5 flex-shrink-0 border-2 border-[rgb(var(--border))] transition-colors disabled:opacity-50 ${checked ? "bg-brand-500" : "bg-[rgb(var(--paper-alt))]"}`}
        >
            <span className={`absolute top-0.5 w-3 h-3 bg-[rgb(var(--border))] transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
        </button>
    );
}
