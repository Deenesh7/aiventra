import clsx from 'clsx';

const levels = {
  low: { cls: 'badge-low', label: 'LOW' },
  medium: { cls: 'badge-medium', label: 'MEDIUM' },
  high: { cls: 'badge-high', label: 'HIGH' },
  critical: { cls: 'badge-critical', label: 'CRITICAL' },
  info: { cls: 'badge-info', label: 'INFO' },
};

export default function ThreatBadge({ level = 'low', className }) {
  const l = levels[level] || levels.low;
  return (
    <span className={clsx('badge', l.cls, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {l.label}
    </span>
  );
}
