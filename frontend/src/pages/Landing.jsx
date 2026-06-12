import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Brain,
  Map,
  Clock,
  FileSearch,
  Network,
  ImageIcon,
  MessageSquare,
  Lock,
  Activity,
  Database,
  Eye,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import Logo from '../components/Logo.jsx';

const features = [
  {
    icon: FileSearch,
    title: 'AI Autopsy Analyzer',
    body: 'Extract cause of death, injury patterns, toxicology and suspicious indicators from unstructured medical reports using domain-tuned NLP.',
  },
  {
    icon: Clock,
    title: 'Time of Death Estimation',
    body: 'Multi-factor postmortem interval inference using body temperature, rigor mortis, livor mortis and environmental signals.',
  },
  {
    icon: Network,
    title: 'Digital Evidence Correlation',
    body: 'Fuse CCTV logs, mobile metadata, GPS, call records and social timestamps into a single chronological investigation graph.',
  },
  {
    icon: Map,
    title: 'Crime Scene Geo-Intelligence',
    body: 'Map crime scenes, suspect movement, CCTV coverage and radius analysis with full timeline playback.',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Scoring & Anomaly Detection',
    body: 'Detect tampering, missing evidence, timeline gaps and contradictory findings. Explainable scoring 0–100.',
  },
  {
    icon: MessageSquare,
    title: 'AI Forensic Assistant',
    body: 'Conversational RAG over case evidence. Ask in natural language. Get cited, traceable answers.',
  },
  {
    icon: ImageIcon,
    title: 'Forensic Image Analysis',
    body: 'Detect weapons, blood patterns and tampering indicators. Enhance low-light scene photography.',
  },
  {
    icon: Brain,
    title: 'Explainable AI Panel',
    body: 'Every prediction shows reasoning, supporting evidence, confidence metrics and the forensic indicators used.',
  },
];

const workflow = [
  { step: '01', title: 'Ingest', desc: 'Upload autopsy reports, scene photos, CCTV, mobile metadata.' },
  { step: '02', title: 'Extract', desc: 'NLP, OCR and vision models extract structured evidence.' },
  { step: '03', title: 'Correlate', desc: 'Vector search and graph reasoning fuse multi-source signals.' },
  { step: '04', title: 'Reconstruct', desc: 'Timeline, geographic and behavioral models reconstruct events.' },
  { step: '05', title: 'Investigate', desc: 'Explainable scores, alerts and leads ready for human review.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-950 text-slate-100 overflow-x-hidden">
      {/* Background ambient layers */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-neon-cyan/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-neon-red/5 blur-[120px] rounded-full" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 px-6 lg:px-10 py-5 flex items-center justify-between">
        <Logo size="md" />
        <div className="hidden md:flex items-center gap-7 text-sm font-mono text-slate-400">
          <a href="#features" className="hover:text-neon-cyan transition-colors">Capabilities</a>
          <a href="#workflow" className="hover:text-neon-cyan transition-colors">Workflow</a>
          <a href="#dashboard" className="hover:text-neon-cyan transition-colors">Preview</a>
          <a href="#security" className="hover:text-neon-cyan transition-colors">Security</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-mono text-slate-300 hover:text-neon-cyan transition-colors px-3 py-2">
            Sign In
          </Link>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-xs">
            Launch Platform
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 px-6 lg:px-10 pt-16 lg:pt-24 pb-32">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-cyan/5 border border-neon-cyan/20 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-neon-cyan/90">
                Operational • Forensic Intelligence v1.0
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6 max-w-5xl">
              Forensic <span className="gradient-text">intelligence</span>,
              <br />
              accelerated by <span className="danger-gradient-text">AI</span>.
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
              AIVENTRA fuses autopsy analytics, digital evidence correlation and geospatial reasoning
              into a single explainable platform for investigators, agencies and forensic specialists.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-sm group">
                Enter Platform
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#features" className="btn-secondary inline-flex items-center gap-2 text-sm">
                Explore Capabilities
                <ChevronRight size={16} />
              </a>
            </div>

            <p className="mt-6 font-mono text-[11px] text-slate-500 max-w-md">
              Investigation-assistance platform. Does not replace medical experts, forensic
              professionals or legal authorities.
            </p>
          </motion.div>

          {/* Hero visual — animated forensic diagram */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 relative"
          >
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* STAT STRIP */}
      <section className="relative z-10 px-6 lg:px-10 py-10 border-y border-white/5 bg-ink-900/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: '94%', l: 'NLP Extraction Accuracy' },
            { v: '< 3s', l: 'Avg Inference Latency' },
            { v: '10+', l: 'Evidence Modalities' },
            { v: '100%', l: 'Explainable Outputs' },
          ].map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center md:text-left"
            >
              <div className="font-display text-3xl md:text-4xl font-bold gradient-text">
                {s.v}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 mt-1">
                {s.l}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 px-6 lg:px-10 py-24">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan/80 mb-3">
              ◆ Capabilities
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Ten modules, one investigation surface
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Every module emits explainable, traceable output. Every output is auditable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="panel panel-hover p-6 group"
              >
                <div className="w-10 h-10 rounded-md bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center mb-4 group-hover:bg-neon-cyan/15 transition-colors">
                  <f.icon size={18} className="text-neon-cyan" />
                </div>
                <h3 className="font-display font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="relative z-10 px-6 lg:px-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan/80 mb-3">
              ◆ Workflow
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
              From evidence to insight in five stages
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent hidden md:block" />
            {workflow.map((w, i) => (
              <motion.div
                key={w.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative panel p-5 text-center"
              >
                <div className="font-mono text-xs text-neon-cyan/60 mb-2">{w.step}</div>
                <div className="font-display font-bold text-lg mb-2">{w.title}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="dashboard" className="relative z-10 px-6 lg:px-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan/80 mb-3">
              ◆ Operations Surface
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Built for investigators, not engineers
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Mission-critical interface. Dark forensic theme. Glassmorphic depth. Every pixel earns its place.
            </p>
          </motion.div>

          <DashboardPreview />
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="relative z-10 px-6 lg:px-10 py-24 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan/80 mb-3">
                ◆ Security & Trust
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Evidence-grade<br />security throughout
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Lock, title: 'JWT-secured access', desc: 'Role-based authentication with short-lived tokens and refresh rotation.' },
                  { icon: Database, title: 'Encrypted storage', desc: 'Evidence and reports encrypted at rest and in transit.' },
                  { icon: Activity, title: 'Full audit trail', desc: 'Every action logged with user, timestamp and chain-of-custody metadata.' },
                  { icon: Eye, title: 'Explainable AI', desc: 'No black boxes. Every prediction includes its reasoning and evidence.' },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex gap-4 panel p-4"
                  >
                    <div className="w-10 h-10 rounded-md bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                      <item.icon size={16} className="text-neon-cyan" />
                    </div>
                    <div>
                      <div className="font-display font-semibold mb-1">{item.title}</div>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative">
              <SecurityVisual />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 lg:px-10 py-24 border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center panel p-12 lg:p-16 relative overflow-hidden corner-brackets"
        >
          <div className="absolute inset-0 bg-radial-glow opacity-50" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Transforming forensic<br />intelligence with AI.
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Authorized for forensic investigators, intelligence agencies and law enforcement.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 text-sm">
              Enter Platform
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-6 lg:px-10 py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" />
          <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] uppercase tracking-wider text-slate-500">
            <a href="#" className="hover:text-neon-cyan">Documentation</a>
            <a href="#" className="hover:text-neon-cyan">API Reference</a>
            <a href="#" className="hover:text-neon-cyan">Compliance</a>
            <a href="#" className="hover:text-neon-cyan">Contact</a>
          </div>
          <div className="font-mono text-[10px] text-slate-600">
            © 2026 AIVENTRA — Forensic Intelligence Systems
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Hero visual — animated forensic diagram ---------- */
function HeroVisual() {
  return (
    <div className="relative panel p-6 md:p-8 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — case file */}
        <div className="lg:col-span-3 panel p-4 bg-ink-900/60">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan/80">Case File</span>
            <span className="badge badge-critical text-[9px]">Critical</span>
          </div>
          <div className="font-mono text-[10px] text-slate-500">AIV-2026-0118</div>
          <div className="font-display text-sm font-semibold mt-1 mb-3">Riverside Residence</div>
          <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
            <div className="flex justify-between"><span>Status</span><span className="text-neon-amber">Active</span></div>
            <div className="flex justify-between"><span>Evidence</span><span className="text-slate-200">23</span></div>
            <div className="flex justify-between"><span>Risk</span><span className="text-neon-red">87 / 100</span></div>
          </div>
        </div>

        {/* CENTER — neural visualization */}
        <div className="lg:col-span-6 panel p-4 bg-ink-900/60 min-h-[280px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan/80">AI Inference Graph</span>
            <span className="font-mono text-[10px] text-neon-green">● LIVE</span>
          </div>
          <svg viewBox="0 0 400 200" className="w-full h-48">
            <defs>
              <radialGradient id="nodeGrad">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Connections */}
            {[
              [60, 50, 200, 100],
              [60, 100, 200, 100],
              [60, 150, 200, 100],
              [200, 100, 340, 60],
              [200, 100, 340, 100],
              [200, 100, 340, 140],
              [60, 50, 200, 50],
              [200, 50, 340, 60],
            ].map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#00e5ff" strokeWidth="0.5" opacity="0.4"
                strokeDasharray="2,3">
                <animate attributeName="stroke-dashoffset" from="0" to="10" dur="2s" repeatCount="indefinite" />
              </line>
            ))}
            {/* Nodes */}
            {[
              { x: 60, y: 50, label: 'Autopsy' },
              { x: 60, y: 100, label: 'CCTV' },
              { x: 60, y: 150, label: 'Mobile' },
              { x: 200, y: 50, label: 'NLP' },
              { x: 200, y: 100, label: 'Fusion' },
              { x: 340, y: 60, label: 'Timeline' },
              { x: 340, y: 100, label: 'Risk' },
              { x: 340, y: 140, label: 'Leads' },
            ].map((n, i) => (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r="14" fill="url(#nodeGrad)" opacity="0.4">
                  <animate attributeName="r" values="14;18;14" dur="3s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                </circle>
                <circle cx={n.x} cy={n.y} r="6" fill="#0a1020" stroke="#00e5ff" strokeWidth="1" />
                <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="3" fill="#00e5ff" fontFamily="monospace">
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* RIGHT — risk score */}
        <div className="lg:col-span-3 panel p-4 bg-ink-900/60 flex flex-col items-center justify-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan/80 mb-3 self-start">
            Threat Assessment
          </div>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
              <circle cx="50" cy="50" r="42" stroke="#ff3358" strokeWidth="6" fill="none"
                strokeDasharray="263" strokeDashoffset="35" strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 8px #ff3358)' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-3xl font-bold text-neon-red">87</div>
              <div className="font-mono text-[9px] text-neon-red/80 uppercase tracking-wider">Critical</div>
            </div>
          </div>
          <div className="mt-4 space-y-1 w-full">
            {[
              { l: 'Timeline gap', v: 22 },
              { l: 'Defensive wounds', v: 18 },
              { l: 'Tox anomaly', v: 16 },
            ].map((f) => (
              <div key={f.l} className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">{f.l}</span>
                <span className="text-neon-red">+{f.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="panel p-2 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-7 bg-ink-900/80 border-b border-white/5 flex items-center px-3 gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-neon-red/60" />
        <span className="w-2 h-2 rounded-full bg-neon-amber/60" />
        <span className="w-2 h-2 rounded-full bg-neon-green/60" />
        <span className="ml-3 font-mono text-[9px] text-slate-500 uppercase tracking-wider">
          aiventra.app/dashboard
        </span>
      </div>
      <div className="pt-7 bg-ink-950 rounded-lg">
        <div className="grid grid-cols-12 gap-3 p-4">
          {/* Side */}
          <div className="col-span-2 space-y-2">
            {['Dashboard', 'Cases', 'Autopsy', 'TOD', 'Timeline', 'Map', 'Risk', 'Assistant'].map((l, i) => (
              <div key={l} className={`text-[10px] font-mono p-2 rounded ${i === 0 ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-slate-500'}`}>
                {l}
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="col-span-10 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: 'Active', v: '24', c: '#00e5ff' },
                { l: 'High Risk', v: '7', c: '#ffb547' },
                { l: 'Critical', v: '3', c: '#ff3358' },
                { l: 'Today', v: '41', c: '#34d399' },
              ].map((s) => (
                <div key={s.l} className="panel p-3">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{s.l}</div>
                  <div className="font-display text-2xl font-bold mt-1" style={{ color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 panel p-4 h-48">
                <div className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan/70 mb-3">Weekly Activity</div>
                <svg viewBox="0 0 300 100" className="w-full h-32">
                  {[
                    [10, 60, 30, 30],
                    [50, 40, 70, 50],
                    [90, 65, 110, 25],
                    [130, 25, 150, 65],
                    [170, 15, 190, 75],
                    [210, 50, 230, 40],
                    [250, 35, 270, 55],
                  ].map(([x, y, x2, h], i) => (
                    <g key={i}>
                      <rect x={x} y={y} width="15" height={100 - y} fill="#00e5ff" opacity="0.6" rx="1" />
                      <rect x={x2} y={100 - h} width="15" height={h} fill="#ff3358" opacity="0.5" rx="1" />
                    </g>
                  ))}
                </svg>
              </div>
              <div className="panel p-4 h-48">
                <div className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan/70 mb-3">Alerts</div>
                {[
                  { c: '#ff3358', t: 'Pattern match 94%' },
                  { c: '#ffb547', t: 'TOD inconsistency' },
                  { c: '#ffb547', t: 'Risk escalation' },
                  { c: '#00e5ff', t: 'New evidence' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="w-1 h-1 rounded-full" style={{ background: a.c }} />
                    <span className="text-[10px] font-mono text-slate-400 truncate">{a.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SecurityVisual() {
  return (
    <div className="relative panel p-8 aspect-square flex items-center justify-center overflow-hidden corner-brackets">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <svg viewBox="0 0 300 300" className="w-full h-full relative">
        <defs>
          <radialGradient id="shieldGrad">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#00e5ff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Outer rings */}
        {[140, 110, 80].map((r, i) => (
          <circle key={r} cx="150" cy="150" r={r}
            fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity={0.2 + i * 0.15}
            strokeDasharray="4,2">
            <animateTransform attributeName="transform" type="rotate"
              from={i % 2 ? '0 150 150' : '360 150 150'}
              to={i % 2 ? '360 150 150' : '0 150 150'}
              dur={`${20 + i * 5}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {/* Shield body */}
        <circle cx="150" cy="150" r="60" fill="url(#shieldGrad)" />
        <path
          d="M150 90 L195 110 L195 155 Q195 185 150 205 Q105 185 105 155 L105 110 Z"
          fill="none" stroke="#00e5ff" strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 8px #00e5ff)' }}
        />
        <path d="M135 150 L147 162 L168 138" fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />
        {/* Orbiting nodes */}
        {[0, 72, 144, 216, 288].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 150 150)`}>
            <line x1="150" y1="20" x2="150" y2="50" stroke="#00e5ff" strokeWidth="0.5" opacity="0.5" />
            <circle cx="150" cy="20" r="3" fill="#00e5ff" />
          </g>
        ))}
      </svg>
    </div>
  );
}
