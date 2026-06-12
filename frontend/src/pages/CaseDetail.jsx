import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  FileText,
  Image as ImageIcon,
  Video,
  Database,
  Eye,
  Download,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { Card } from '../components/Card.jsx';
import ThreatBadge from '../components/ThreatBadge.jsx';
import RiskGauge from '../components/RiskGauge.jsx';
import { casesService, evidenceService } from '../services/firestore.js';
import { mockCases, mockEvidence, mockTimelineEvents } from '../data/mockData.js';

export default function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([casesService.get(id), evidenceService.listForCase(id)])
      .then(([cRes, eRes]) => {
        setCaseData(
          cRes.status === 'fulfilled' && cRes.value
            ? cRes.value
            : mockCases.find((c) => c.id === id) || mockCases[0],
        );
        setEvidence(eRes.status === 'fulfilled' && eRes.value?.length ? eRes.value : mockEvidence);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !caseData) {
    return <div className="text-center py-12"><span className="loading-dots"><span /><span /><span /></span></div>;
  }

  return (
    <div>
      <Link to="/app/cases" className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-neon-cyan mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to Cases
      </Link>

      <PageHeader
        eyebrow={`◆ ${caseData.id}`}
        title={caseData.title}
        description={caseData.summary}
        badge={<ThreatBadge level={caseData.threat_level} />}
      />

      {/* Top stats grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="Case Profile" delay={0}>
          <dl className="space-y-3 text-sm">
            <DetailRow
              icon={User}
              label="Victim"
              value={
                caseData.victim
                  ? `${caseData.victim.name || 'Unknown'}${
                      caseData.victim.age ? `, ${caseData.victim.age}` : ''
                    }${
                      typeof caseData.victim.gender === 'string'
                        ? ' (' + caseData.victim.gender + ')'
                        : ''
                    }`
                  : '—'
              }
            />
            <DetailRow
              icon={MapPin}
              label="Location"
              value={
                typeof caseData.location === 'string'
                  ? caseData.location
                  : caseData.location?.address || '—'
              }
            />
            <DetailRow
              icon={Calendar}
              label="Created"
              value={
                caseData.created_at
                  ? new Date(caseData.created_at).toLocaleString()
                  : '—'
              }
            />
            <DetailRow
              icon={Calendar}
              label="Updated"
              value={
                caseData.updated_at || caseData.last_updated
                  ? new Date(caseData.updated_at || caseData.last_updated).toLocaleString()
                  : '—'
              }
            />
            <DetailRow
              icon={User}
              label="Lead"
              value={
                typeof caseData.investigator === 'string'
                  ? caseData.investigator
                  : caseData.investigator?.name || '—'
              }
            />
          </dl>
        </Card>

        <div className="lg:col-span-2 panel p-6 flex items-center gap-8">
          <RiskGauge score={caseData.risk_score} />
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan/80 mb-2">
              AI Assessment
            </div>
            <h3 className="font-display font-bold text-lg mb-2">Elevated Threat Indicators Detected</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              The risk model classifies this investigation as <span className="text-neon-red font-semibold">{caseData.threat_level || caseData.risk_level || 'medium'}</span>.
              Convergent signals across forensic, digital and behavioral evidence streams warrant immediate review.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/app/risk" className="btn-secondary text-xs">View Full Risk Analysis</Link>
              <Link to="/app/timeline" className="btn-secondary text-xs">Open Timeline</Link>
              <Link to="/app/map" className="btn-secondary text-xs">Geo-Intelligence</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card title="Evidence Vault" subtitle={`${evidence.length} items`} icon={Database} className="lg:col-span-3" delay={0.15}>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2">
            {evidence.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-md bg-ink-900/40 border border-white/5 hover:border-neon-cyan/20 transition-colors group"
              >
                <EvidenceIcon type={e.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.name || e.label || '—'}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-slate-500">
                      {e.id}
                      {e.metadata?.size ? ` · ${(e.metadata.size / 1024).toFixed(0)} KB` : e.size ? ` · ${e.size}` : ''}
                    </span>
                    <ThreatBadge level={e.priority || e.severity || 'low'} className="text-[9px]" />
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded hover:bg-neon-cyan/10 text-neon-cyan"><Eye size={13} /></button>
                  <button className="p-1.5 rounded hover:bg-neon-cyan/10 text-neon-cyan"><Download size={13} /></button>
                  <button className="p-1.5 rounded hover:bg-neon-red/10 text-neon-red"><Trash2 size={13} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card title="Investigation Timeline" subtitle="AI-reconstructed sequence" className="lg:col-span-2" delay={0.2}>
          <ul className="space-y-3 max-h-[480px] overflow-y-auto">
            {mockTimelineEvents.map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${ev.anomaly ? 'bg-neon-red' : 'bg-neon-cyan'}`}
                       style={{ boxShadow: ev.anomaly ? '0 0 8px #ff3358' : '0 0 8px #00e5ff' }} />
                  <div className="w-px flex-1 bg-white/5 mt-1" />
                </div>
                <div className="pb-3 flex-1">
                  <div className="font-mono text-[10px] text-slate-500">
                    {new Date(ev.time).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div className={`text-xs mt-0.5 leading-relaxed ${ev.anomaly ? 'text-neon-red font-medium' : ''}`}>
                    {ev.label}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {ev.type.toUpperCase()} · conf {Math.round(ev.confidence * 100)}%
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-neon-cyan flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
        <dd className="text-sm text-slate-200 truncate">{value}</dd>
      </div>
    </div>
  );
}

function EvidenceIcon({ type }) {
  const map = {
    document: { Icon: FileText, color: '#00e5ff' },
    image: { Icon: ImageIcon, color: '#a78bfa' },
    video: { Icon: Video, color: '#ff3358' },
    log: { Icon: Database, color: '#34d399' },
  };
  const { Icon, color } = map[type] || map.document;
  return (
    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
         style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
      <Icon size={14} style={{ color }} />
    </div>
  );
}
