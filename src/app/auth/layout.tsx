export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[rgb(var(--paper))]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-14 bg-ink relative overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Stacked accent rectangles — pure design element */}
        <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-500" />
        <div className="absolute top-0 right-1.5 w-px h-full bg-brand-700" />

        {/* Brand mark */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 flex items-center justify-center">
            <span className="text-brand-400 font-black text-xs font-mono">hG</span>
          </div>
          <span className="text-white font-black text-base tracking-tight">haGIT</span>
        </div>

        {/* Copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-white font-black text-4xl leading-[1.1] tracking-tight">
              Build habits like<br />
              you build software.
            </p>
            <div className="mt-4 h-1 w-16 bg-brand-500" />
          </div>

          <div className="space-y-2.5">
            {[
              "git commit -m \"Read for 30 minutes\"",
              "git commit -m \"Went for a 5k run\"",
              "git commit -m \"No phone before 9am\"",
            ].map((line, i) => (
              <div
                key={i}
                className="border border-white/10 px-3 py-2 font-mono text-[11px] text-white/50"
                style={{ opacity: 1 - i * 0.25 }}
              >
                <span className="text-brand-400">$</span> {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
