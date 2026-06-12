import { motion } from 'framer-motion';
import { isValidElement } from 'react';

// Renders the `badge` prop in one of three forms:
//   1. A React element (JSX), e.g. <ThreatBadge level="high" />
//   2. A plain string, e.g. "Live mode"
//   3. A descriptor object: { label: "...", tone: "cyan"|"red"|"green"|"amber"|"violet" }
function renderBadge(badge) {
  if (!badge) return null;
  if (isValidElement(badge)) return badge;
  if (typeof badge === 'string') {
    return <span className="badge badge-info">{badge}</span>;
  }
  if (typeof badge === 'object' && badge.label) {
    const tone = badge.tone || 'cyan';
    const toneClasses = {
      cyan: 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10',
      red: 'border-neon-red/40 text-neon-red bg-neon-red/10',
      green: 'border-neon-green/40 text-neon-green bg-neon-green/10',
      amber: 'border-neon-amber/40 text-neon-amber bg-neon-amber/10',
      violet: 'border-violet-400/40 text-violet-300 bg-violet-400/10',
    }[tone] || 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10';
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${toneClasses}`}
      >
        {badge.label}
      </span>
    );
  }
  return null;
}

export default function PageHeader({ eyebrow, title, description, action, badge }) {
  const badgeNode = renderBadge(badge);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-neon-cyan/80">
                {eyebrow}
              </span>
              {badgeNode}
            </div>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-slate-400 mt-2 max-w-2xl text-sm">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
}
