export function LoadingDots({ label = 'Processing' }) {
  return (
    <div className="flex items-center gap-3">
      <div className="loading-dots">
        <span /><span /><span />
      </div>
      <span className="font-mono text-xs uppercase tracking-wider text-neon-cyan/80">
        {label}
      </span>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink-950">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-neon-cyan/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-cyan animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-r-neon-red animate-spin"
             style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      </div>
      <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan/70 animate-pulse">
        Initializing AIVENTRA
      </p>
    </div>
  );
}
