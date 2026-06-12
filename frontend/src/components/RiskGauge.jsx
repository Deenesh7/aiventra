import { motion } from 'framer-motion';

export default function RiskGauge({ score = 0, size = 180, label = 'RISK SCORE' }) {
  const radius = size / 2 - 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#ff3358' : score >= 60 ? '#ff7733' : score >= 40 ? '#ffb547' : '#34d399';
  const levelLabel =
    score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`gaugeGrad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
        </defs>
        {/* Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
          fill="none"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {/* Tick marks */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * 360;
          const x1 = size / 2 + (radius + 8) * Math.cos((angle * Math.PI) / 180);
          const y1 = size / 2 + (radius + 8) * Math.sin((angle * Math.PI) / 180);
          const x2 = size / 2 + (radius + 12) * Math.cos((angle * Math.PI) / 180);
          const y2 = size / 2 + (radius + 12) * Math.sin((angle * Math.PI) / 180);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(0,229,255,0.15)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-4xl font-bold" style={{ color }}>
          {score}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mt-1">
          / 100
        </div>
        <div
          className="font-mono text-[10px] uppercase tracking-[0.3em] mt-2 px-2 py-0.5 rounded"
          style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}
        >
          {levelLabel}
        </div>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-3">
        {label}
      </div>
    </div>
  );
}
