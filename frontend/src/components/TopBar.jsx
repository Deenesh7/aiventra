import { Search, Bell, Activity } from 'lucide-react';
import { useState } from 'react';

export default function TopBar() {
  const [now] = useState(new Date());

  return (
    <header className="h-16 sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search cases, evidence, or use natural language…"
              className="w-full pl-9 pr-4 py-2 rounded-md font-mono text-xs bg-ink-900/70 border border-white/5 focus:border-neon-cyan/40 focus:outline-none transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 hidden md:block">
              ⌘K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-neon-green/5 border border-neon-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-neon-green/90">
              System Online
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
            <Activity size={13} className="text-neon-cyan" />
            <span>
              {now.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}{' '}
              UTC
            </span>
          </div>

          <button className="relative w-9 h-9 rounded-md border border-white/5 bg-ink-900/70 flex items-center justify-center hover:border-neon-cyan/40 transition-colors">
            <Bell size={15} className="text-slate-300" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-red flex items-center justify-center text-[9px] font-bold text-ink-950">
              3
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
