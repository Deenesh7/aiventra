import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, FolderOpen, MapPin, Calendar, User } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { Card } from '../components/Card.jsx';
import ThreatBadge from '../components/ThreatBadge.jsx';
import { casesService, demoSeed } from '../services/firestore.js';
import { mockCases } from '../data/mockData.js';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { id: 'all', label: 'All Cases' },
  { id: 'active', label: 'Active' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'closed', label: 'Closed' },
];

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    demoSeed
      .ensureSeeded()
      .catch(() => {})
      .then(() => casesService.list())
      .then((data) => setCases(data?.length ? data : mockCases))
      .catch((e) => {
        console.warn('[cases] Firestore unavailable, using mock data:', e?.code || e);
        setCases(mockCases);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = cases.filter((c) => {
    if (tab !== 'all' && c.status !== tab) return false;
    if (search) {
      const locStr = typeof c.location === 'string' ? c.location : c.location?.address || '';
      if (!`${c.id} ${c.case_number || ''} ${c.title} ${locStr}`.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="◆ Case Registry"
        title="Investigations"
        description="Manage open investigations, review evidence and track risk progression."
        action={
          <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} />
            New Case
          </button>
        }
      />

      {/* Filter bar */}
      <div className="panel p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case ID, title or location…"
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 rounded-md font-mono text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="loading-dots inline-flex"><span /><span /><span /></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link to={`/app/cases/${c.id}`}>
                <div className="panel panel-hover p-5 h-full group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={14} className="text-neon-cyan" />
                      <span className="font-mono text-[10px] text-neon-cyan/80">{c.id}</span>
                    </div>
                    <ThreatBadge level={c.threat_level} />
                  </div>
                  <h3 className="font-display font-semibold text-base mb-2 group-hover:text-neon-cyan transition-colors line-clamp-2">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">{c.summary}</p>

                  <div className="space-y-1.5 text-[11px] font-mono text-slate-400 mb-4">
                    <Row
                      icon={MapPin}
                      text={
                        typeof c.location === 'string'
                          ? c.location
                          : c.location?.address || '—'
                      }
                    />
                    <Row
                      icon={User}
                      text={
                        c.victim
                          ? `${c.victim.name || 'Unknown'}${
                              c.victim.age ? ' · ' + c.victim.age : ''
                            }${
                              typeof c.victim.gender === 'string'
                                ? ', ' + c.victim.gender
                                : ''
                            }`
                          : '—'
                      }
                    />                    <Row icon={Calendar} text={new Date(c.created_at).toLocaleDateString()} />
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Risk</div>
                        <div className="font-display text-lg font-bold" style={{ color: c.risk_score >= 80 ? '#ff3358' : c.risk_score >= 60 ? '#ffb547' : '#34d399' }}>
                          {c.risk_score}
                        </div>
                      </div>
                      <div className="w-px h-8 bg-white/5" />
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Evidence</div>
                        <div className="font-display text-lg font-bold">{c.evidence_count}</div>
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 capitalize">
                      {c.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && <CreateCaseModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function Row({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <Icon size={11} className="text-slate-500 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function CreateCaseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    victim_name: '',
    victim_age: '',
    victim_gender: 'M',
    location_address: '',
    location_lat: '',
    location_lng: '',
    priority: 'medium',
    summary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await casesService.create({
        title: form.title,
        victim_name: form.victim_name,
        victim_age: form.victim_age ? parseInt(form.victim_age, 10) : null,
        victim_gender: form.victim_gender,
        location: form.location_address,
        priority: form.priority,
        description: form.summary,
      });
      toast.success('Case created');
      onCreated();
    } catch (e) {
      console.warn('[cases] create failed:', e?.code || e);
      toast.error('Could not create case — check Firestore rules');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="panel-hover panel p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display text-xl font-bold mb-1">New Investigation</h2>
        <p className="text-xs text-slate-400 mb-6 font-mono">Provision a new case in the registry.</p>

        <form onSubmit={submit} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />

          <div className="grid grid-cols-3 gap-3">
            <Input label="Victim Name" value={form.victim_name} onChange={(v) => setForm({ ...form, victim_name: v })} required />
            <Input label="Age" value={form.victim_age} onChange={(v) => setForm({ ...form, victim_age: v })} />
            <Select label="Gender" value={form.victim_gender} onChange={(v) => setForm({ ...form, victim_gender: v })} options={[['M', 'Male'], ['F', 'Female'], ['O', 'Other'], ['U', 'Unknown']]} />
          </div>

          <Input label="Location Address" value={form.location_address} onChange={(v) => setForm({ ...form, location_address: v })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" value={form.location_lat} onChange={(v) => setForm({ ...form, location_lat: v })} placeholder="13.0827" />
            <Input label="Longitude" value={form.location_lng} onChange={(v) => setForm({ ...form, location_lng: v })} placeholder="80.2707" />
          </div>

          <Select label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical']]} />

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">Summary</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={3}
              className="input-field resize-none"
              placeholder="Initial case description…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Creating…' : 'Create Case'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Input({ label, value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        {options.map(([v, l]) => <option key={v} value={v} className="bg-ink-900">{l}</option>)}
      </select>
    </div>
  );
}
