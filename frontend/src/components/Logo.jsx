export default function Logo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { wrap: 'gap-2', icon: 'w-7 h-7', text: 'text-base', sub: 'text-[10px]' },
    md: { wrap: 'gap-2.5', icon: 'w-9 h-9', text: 'text-xl', sub: 'text-[11px]' },
    lg: { wrap: 'gap-3', icon: 'w-12 h-12', text: 'text-3xl', sub: 'text-xs' },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.wrap}`}>
      <div className={`${s.icon} relative flex-shrink-0`}>
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path
            d="M32 4 L56 18 L56 40 Q56 54 32 60 Q8 54 8 40 L8 18 Z"
            fill="none"
            stroke="url(#logoGrad)"
            strokeWidth="2.5"
          />
          <circle cx="32" cy="28" r="6" fill="url(#logoGrad)" />
          <path d="M32 36 L32 48" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M20 28 L26 28 M38 28 L44 28" stroke="#ff3358" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="28" r="11" fill="none" stroke="url(#logoGrad)" strokeWidth="0.8" opacity="0.5" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-display font-bold tracking-tight ${s.text}`}>
            AIVENTRA
          </span>
          <span className={`font-mono uppercase tracking-[0.25em] text-neon-cyan/60 ${s.sub}`}>
            Forensic Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
