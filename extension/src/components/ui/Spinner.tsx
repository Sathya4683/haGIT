import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block w-4 h-4 border-2 border-[rgb(var(--border))]/30 border-t-[rgb(var(--border))] rounded-full animate-spin",
        className
      )}
    />
  );
}
