import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  AlertTriangle,
  ShieldAlert,
  UploadCloud,
  Activity,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { Card, StatCard } from '../components/Card.jsx';
import ThreatBadge from '../components/ThreatBadge.jsx';
import { mockDashboardStats, mockCases, mockTimelineEvents } from '../data/mockData.js';
import { dashboardService, demoSeed } from '../services/firestore.js';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart,
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(mockDashboardStats);
  const [priorityCases, setPriorityCases] = useState(mockCases.slice(0, 5));
  const [, setLoading] = useState(true);

  useEffect(() => {
    demoSeed
      .ensureSeeded()
      .catch(() => {})
      .then(() => dashboardService.overview())
      .then((data) => {
        setStats({ ...mockDashboardStats, ...data, ...data?.stats });
        if (data?.priority_cases?.length) {
          setPriorityCases(data.priority_cases);
        }
      })
      .catch((e) => {
        console.warn('[dashboard] Firestore unavailable:', e?.code || e);
        setStats(mockDashboardStats);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="◆ Operations Console"
        title="Forensic Intelligence Dashboard"
        description="Live overview of active investigations, risk indicators, and AI-generated insights."
        badge={<ThreatBadge level="high" />}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Cases" value={stats.active_cases} icon={FolderOpen} hint="↗ 12% week-over-week" delay={0} />
        <StatCard label="High Risk" value={stats.high_risk} accent="amber" icon={AlertTriangle} hint="Requires attention" delay={0.05} />
        <StatCard label="Critical Threat" value={stats.critical_risk} accent="red" icon={ShieldAlert} hint="Escalated for action" delay={0.1} />
        <StatCard label="Evidence Today" value={stats.evidence_uploaded_today} accent="green" icon={UploadCloud} hint={`${stats.ai_summaries_generated} summaries generated`} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly activity chart */}
        <Card title="Weekly Activity" subtitle="Cases · Evidence · Alerts" icon={Activity} className="lg:col-span-2" delay={0.2}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekly_activity} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{
                    background: '#0d1424',
                    border: '1px solid rgba(0,229,255,0.3)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Bar dataKey="cases" fill="#00e5ff" radius={[2, 2, 0, 0]} />
                <Bar dataKey="evidence" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="alerts" fill="#ff3358" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-4 text-[11px] font-mono">
            <Legend color="#00e5ff" label="Cases" />
            <Legend color="#3b82f6" label="Evidence" />
            <Legend color="#ff3358" label="Alerts" />
          </div>
        </Card>

        {/* Alerts feed */}
        <Card title="Active Alerts" subtitle="Real-time AI signals" icon={AlertTriangle} delay={0.25}>
          <ul className="space-y-2.5">
            {stats.recent_alerts.map((alert, i) => (
              <motion.li
                key={alert.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex gap-3 p-3 rounded-md bg-ink-900/40 border border-white/5 hover:border-neon-cyan/20 transition-colors"
              >
                <div className={`w-1 rounded-full ${alert.severity === 'critical' ? 'bg-neon-red' : alert.severity === 'high' ? 'bg-neon-amber' : 'bg-neon-cyan'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug">{alert.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ThreatBadge level={alert.severity} />
                    <span className="font-mono text-[10px] text-slate-500">{alert.time}</span>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Cases preview & timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        <Card
          title="Priority Cases"
          subtitle="Sorted by AI risk score"
          icon={ShieldAlert}
          className="lg:col-span-3"
          action={
            <Link to="/app/cases" className="text-xs font-mono text-neon-cyan hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          }
          delay={0.3}
        >
          <div className="space-y-2">
            {priorityCases.slice(0, 5).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <Link
                  to={`/app/cases/${c.id}`}
                  className="block p-3 rounded-md bg-ink-900/40 border border-white/5 hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-[10px] text-neon-cyan/80 w-28 flex-shrink-0">
                      {c.case_number || c.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {typeof c.location === 'string' ? c.location : c.location?.address || ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <RiskMini score={c.risk_score} />
                      <ThreatBadge level={c.threat_level || c.risk_level || 'low'} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card title="Recent Timeline" subtitle="Last AI-processed events" icon={Clock} className="lg:col-span-2" delay={0.35}>
          <ul className="space-y-3">
            {mockTimelineEvents.slice(0, 6).map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${ev.anomaly ? 'bg-neon-red shadow-neon-red' : 'bg-neon-cyan shadow-neon-cyan'}`} />
                  <div className="w-px flex-1 bg-white/5 mt-1" />
                </div>
                <div className="pb-3">
                  <div className="font-mono text-[10px] text-slate-500">
                    {new Date(ev.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} · {ev.type.toUpperCase()}
                  </div>
                  <div className={`text-xs mt-0.5 ${ev.anomaly ? 'text-neon-red' : ''}`}>
                    {ev.label}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Bottom — Trend */}
      <Card
        title="Investigation Throughput"
        subtitle="30-day AI processing volume"
        icon={TrendingUp}
        className="mt-6"
        delay={0.4}
      >
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={Array.from({ length: 30 }, (_, i) => ({
                day: i + 1,
                volume: 50 + Math.sin(i / 3) * 25 + Math.random() * 20 + i,
                ai_summaries: 20 + Math.sin(i / 4) * 10 + Math.random() * 8 + i / 2,
              }))}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sums" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
              <YAxis stroke="#64748b" fontSize={10} fontFamily="JetBrains Mono" />
              <Tooltip
                contentStyle={{
                  background: '#0d1424',
                  border: '1px solid rgba(0,229,255,0.3)',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="volume" stroke="#00e5ff" strokeWidth={2} fill="url(#vol)" />
              <Area type="monotone" dataKey="ai_summaries" stroke="#a78bfa" strokeWidth={2} fill="url(#sums)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function RiskMini({ score }) {
  const color = score >= 80 ? '#ff3358' : score >= 60 ? '#ffb547' : score >= 40 ? '#ffb547' : '#34d399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
