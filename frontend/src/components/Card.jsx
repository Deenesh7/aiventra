import { motion } from 'framer-motion';
import clsx from 'clsx';

export function Card({ children, className, title, subtitle, icon: Icon, action, hover = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={clsx('panel p-5 relative', hover && 'panel-hover', className)}
    >
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-md flex items-center justify-center bg-neon-cyan/10 border border-neon-cyan/20 flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-neon-cyan" size={18} />
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="font-display text-base font-semibold truncate">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, hint, accent = 'cyan', icon: Icon, delay = 0 }) {
  const accents = {
    cyan: 'text-neon-cyan border-neon-cyan/20 from-neon-cyan/10',
    red: 'text-neon-red border-neon-red/25 from-neon-red/10',
    amber: 'text-neon-amber border-neon-amber/25 from-neon-amber/10',
    green: 'text-neon-green border-neon-green/25 from-neon-green/10',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={clsx(
        'panel p-5 relative overflow-hidden bg-gradient-to-br to-transparent',
        accents[accent].split(' ').slice(1).join(' ')
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-20 blur-3xl"
           style={{ background: accent === 'red' ? '#ff3358' : accent === 'amber' ? '#ffb547' : accent === 'green' ? '#34d399' : '#00e5ff' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">{label}</span>
          {Icon && <Icon className={clsx('w-4 h-4', accents[accent].split(' ')[0])} size={16} />}
        </div>
        <div className={clsx('font-display text-3xl font-bold tracking-tight', accents[accent].split(' ')[0])}>
          {value}
        </div>
        {hint && <p className="text-xs text-slate-400 font-mono mt-2">{hint}</p>}
      </div>
    </motion.div>
  );
}
