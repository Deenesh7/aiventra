import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, TrendingUp, Eye, Brain, Zap, ChevronRight, RotateCw, Search } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import RiskGauge from '../components/RiskGauge';
import ThreatBadge from '../components/ThreatBadge';
import { mockRiskAnalysis } from '../data/mockData';
import { riskApi } from '../services/api.js';
import { casesService, analysisService } from '../services/firestore.js';

export default function RiskAnomalies() {
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [r, setR] = useState(mockRiskAnalysis);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    casesService
      .list()
      .then((rows) => {
        if (rows.length) {
          setCases(rows);
          setActiveCase(rows[0]);
        }
      })
      .catch((e) => console.warn('[risk] cases load failed:', e?.code || e));
  }, []);

  const runScore = async (caseId) => {
    setLoading(true);
    try {
      const data = await riskApi.score(caseId);
      setR(data);
      setIsLive(true);

      // Persist + update case risk_score
      try {
        await analysisService.save({
          caseId,
          type: 'risk',
          payload: data,
          summary: `Risk ${data.score}/100 (${data.level})`,
        });
        if (activeCase) {
          await casesService.setRisk(activeCase.id, data.score, data.level);
        }
      } catch (e) {
        console.warn('[risk] persist skipped:', e?.code || e);
      }
      toast.success(`Risk scored: ${data.score}/100`);
    } catch (e) {
      console.warn('[risk] backend unreachable, using mock:', e?.message);
      setR(mockRiskAnalysis);
      setIsLive(false);
      toast.error('AI backend offline — showing demo data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCase?.case_number) runScore(activeCase.case_number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase?.id]);

  const safeR = {
    score: r?.score ?? 0,
    level: r?.level ?? 'low',
    confidence: r?.confidence ?? 0,
    model_version: r?.model_version ?? '—',
    inference_ms: r?.inference_ms ?? 0,
    features_count: r?.features_count ?? 0,
    factors: Array.isArray(r?.factors) ? r.factors : [],
    anomalies: Array.isArray(r?.anomalies) ? r.anomalies : [],
    recommendations: Array.isArray(r?.recommendations) ? r.recommendations : [],
  };

  const radarData = safeR.factors.map((f) => ({
    factor: f.name,
    score: f.score,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 05"
        title="Risk Scoring & Anomaly Detection"
        description="Explainable AI risk modeling — surfaces tampered metadata, missing evidence, contradictions and timeline gaps."
        badge={{
          label: isLive ? 'Live · scored' : 'Demo mode',
          tone: isLive ? 'red' : 'cyan',
        }}
      />

      {/* Case picker */}
      <div className="panel p-3 flex flex-wrap items-center gap-3">
        <Search className="w-4 h-4 text-zinc-500 ml-2" />
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Active case
        </span>
        <select
          value={activeCase?.id || ''}
          onChange={(e) => {
            const c = cases.find((x) => x.id === e.target.value);
            if (c) setActiveCase(c);
          }}
          className="flex-1 min-w-[260px] bg-ink-900 border border-ink-700 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-neon-cyan focus:outline-none"
        >
          {cases.length === 0 && <option value="">No cases — using demo data</option>}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_number} · {c.title?.slice(0, 50)}
            </option>
          ))}
        </select>
        <button
          onClick={() => activeCase && runScore(activeCase.case_number)}
          disabled={loading || !activeCase}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
        >
          <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Recompute
        </button>
      </div>

      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-6 corner-brackets text-center"
        >
          <p className="section-label mb-4">Composite Risk Index</p>
          <RiskGauge score={safeR.score} />
          <div className="mt-4 flex items-center justify-center gap-2">
            <ThreatBadge level={safeR.level} />
            <span className="font-mono text-xs text-zinc-500">v{safeR.model_version}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="panel p-6"
        >
          <p className="section-label mb-3">Factor Profile</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1f2937" />
                <PolarAngleAxis
                  dataKey="factor"
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <PolarRadiusAxis stroke="#1f2937" tick={false} domain={[0, 100]} />
                <Radar
                  dataKey="score"
                  stroke="#00e5ff"
                  fill="#00e5ff"
                  fillOpacity={0.3}
                  strokeWidth={1.5}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0a0d14',
                    border: '1px solid #1f2937',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel p-6 space-y-4"
        >
          <p className="section-label">AI Reasoning</p>
          <div className="space-y-3">
            {[
              { icon: Brain, label: 'Model', value: 'GradientBoost + Rules' },
              { icon: TrendingUp, label: 'Confidence', value: `${safeR.confidence}%` },
              { icon: Zap, label: 'Inference time', value: `${safeR.inference_ms} ms` },
              { icon: Eye, label: 'Features used', value: `${safeR.features_count}` },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500 uppercase flex items-center gap-2">
                  <s.icon className="w-3 h-3" /> {s.label}
                </span>
                <span className="text-sm font-mono text-zinc-200">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Factor breakdown */}
      <Card title="Risk Factor Breakdown" eyebrow="Explainability" delay={0.15}>
        <div className="space-y-4">
          {safeR.factors.map((f, i) => (
            <motion.div
              key={`factor-${i}-${f?.name || 'unnamed'}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-ink-900/40 border border-ink-800 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-display text-base text-zinc-100">{f.name}</span>
                  <ThreatBadge level={f.level} />
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-zinc-500">
                    weight {(f.weight * 100).toFixed(0)}%
                  </span>
                  <span className="font-mono text-lg text-neon-cyan">{f.score}</span>
                </div>
              </div>
              <div className="h-1.5 bg-ink-900 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${f.score}%` }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                  className={`h-full ${
                    f.score >= 70
                      ? 'bg-neon-red'
                      : f.score >= 40
                      ? 'bg-neon-amber'
                      : 'bg-neon-green'
                  }`}
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{f.reasoning}</p>
              {f.evidence && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.evidence.map((e, idx) => (
                    <span
                      key={`ev-${i}-${idx}-${e}`}
                      className="text-[10px] font-mono px-1.5 py-0.5 bg-ink-800 border border-ink-700 rounded text-zinc-400"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Detected anomalies + recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Detected Anomalies" eyebrow="Pattern alerts" accent="red" delay={0.2}>
          <div className="space-y-3">
            {safeR.anomalies.map((a, i) => (
              <motion.div
                key={`anom-${i}-${a?.title || ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex gap-3 p-3 bg-neon-red/[0.04] border border-neon-red/20 rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 text-neon-red flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-display text-zinc-100">{a.title}</p>
                    <ThreatBadge level={a.severity} />
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{a.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card title="Suggested Actions" eyebrow="Investigation leads" delay={0.25}>
          <div className="space-y-2">
            {safeR.recommendations.map((rec, i) => (
              <motion.div
                key={`rec-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-start gap-3 p-3 bg-ink-900/40 border border-ink-800 rounded-lg hover:border-neon-cyan/30 cursor-pointer transition"
              >
                <ChevronRight className="w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5" />
                <p className="text-sm text-zinc-300 leading-relaxed">{rec}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
