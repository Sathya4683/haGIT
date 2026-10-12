export function Section({ title, children, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <div className="flex gap-2.5">
                {icon && <span className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">{icon}</span>}
                <div className="min-w-0">
                    <h3 className="text-sm font-black leading-7">{title}</h3>
                    {hint && <p className="text-xs text-[rgb(var(--ink-muted))] leading-snug">{hint}</p>}
                </div>
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
            className={`relative w-11 h-6 flex-shrink-0 rounded-full border-2 border-[rgb(var(--border))] transition-colors disabled:opacity-50 ${checked ? "bg-brand-500" : "bg-[rgb(var(--paper-alt))]"}`}
        >
            <span className={`absolute top-[2px] w-4 h-4 rounded-full border-2 border-[rgb(var(--border))] bg-white transition-all ${checked ? "left-[20px]" : "left-[2px]"}`} />
        </button>
    );
}
