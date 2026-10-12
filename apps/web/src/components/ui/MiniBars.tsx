import { format, subDays } from "date-fns";

interface Props {
    /** Daily values, oldest first; the last value is today. */
    values: number[];
    color: string;
    height?: number;
    className?: string;
}

/** Compact daily bar chart (sparkline). Rounded data-ends on a shared baseline. */
export function MiniBars({ values, color, height = 28, className }: Props) {
    const max = Math.max(1, ...values);
    const today = new Date();
    return (
        <div className={`flex items-end gap-[3px] ${className ?? ""}`} style={{ height }} role="img"
            aria-label={`Last ${values.length} days: ${values.reduce((a, b) => a + b, 0)} commits`}>
            {values.map((v, i) => {
                const day = subDays(today, values.length - 1 - i);
                return (
                    <span
                        key={i}
                        title={`${format(day, "EEE d MMM")}: ${v} commit${v === 1 ? "" : "s"}`}
                        className="flex-1 min-w-[3px] max-w-[9px] rounded-t-[3px]"
                        style={{
                            height: v ? `${Math.max(18, (v / max) * 100)}%` : "3px",
                            background: v ? color : "rgb(var(--ink) / 0.12)",
                        }}
                    />
                );
            })}
        </div>
    );
}
