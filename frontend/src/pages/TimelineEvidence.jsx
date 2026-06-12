import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { Clock, Filter, AlertTriangle, Camera, Phone, MapPin, Activity, FileText, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import ThreatBadge from '../components/ThreatBadge';
import { mockTimelineEvents } from '../data/mockData';
import { timelineApi } from '../services/api.js';
import { casesService, timelineService } from '../services/firestore.js';

// Coerce any "location" value to a renderable string. Backend sometimes
// returns location as a plain string ("Sector C - Junction CAM-04") but
// Firestore docs (especially geo-tagged events) may store an object like
// {lat, lng, address}. Rendering an object as a JSX child crashes React.
function toLocString(loc) {
  if (loc == null) return '';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') {
    if (loc.address) return loc.address;
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    }
    return JSON.stringify(loc);
  }
  return String(loc);
}

const typeIcons = {
  cctv: Camera,
  phone: Phone,
  gps: MapPin,
  call: Phone,
  social: Activity,
  anomaly: AlertTriangle,
  document: FileText,
};

const typeColors = {
  cctv: '#00e5ff',
  phone: '#a78bfa',
  gps: '#34d399',
  call: '#fbbf24',
  social: '#f472b6',
  anomaly: '#ff3358',
  document: '#94a3b8',
};

export default function TimelineEvidence() {
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [timelineData, setTimelineData] = useState(mockTimelineEvents);
  const [isLive, setIsLive] = useState(false);

  // Load cases on mount
  useEffect(() => {
    casesService
      .list()
      .then((rows) => {
        if (rows.length) {
          setCases(rows);
          setActiveCase(rows[0]);
        }
      })
      .catch((e) => console.warn('[timeline] cases load failed:', e?.code || e));
  }, []);

  // Load events for active case
  useEffect(() => {
    if (!activeCase?.case_number) return;
    const load = async () => {
      // Prefer Firestore-stored timeline events
      try {
        const fsEvents = await timelineService.listForCase(activeCase.id);
        if (fsEvents.length) {
          setTimelineData(fsEvents);
          setIsLive(true);
          return;
        }
      } catch (_) {
        /* fall through */
      }
      // Otherwise hit the AI backend (which synthesizes events)
      try {
        const data = await timelineApi.forCase(activeCase.case_number);
        if (data?.events?.length) {
          setTimelineData(data.events);
          setIsLive(true);
          // Persist to Firestore so subsequent loads are fast
          try {
            for (const evt of data.events) {
              await timelineService.add(activeCase.id, evt);
            }
          } catch (e) {
            console.warn('[timeline] persist skipped:', e?.code || e);
          }
          return;
        }
      } catch (e) {
        console.warn('[timeline] backend unreachable:', e?.message);
      }
      setTimelineData(mockTimelineEvents);
      setIsLive(false);
    };
    load();
  }, [activeCase?.id]);

  const events = useMemo(() => {
    if (filter === 'all') return timelineData;
    if (filter === 'anomalies')
      return timelineData.filter((e) => e.severity === 'critical' || e.severity === 'high');
    return timelineData.filter((e) => e.source === filter);
  }, [timelineData, filter]);

  // Build nodes & edges for React Flow
  const { nodes, edges } = useMemo(() => {
    const nds = events.map((e, i) => ({
      id: e.id,
      position: { x: 80 + (i % 4) * 240, y: 80 + Math.floor(i / 4) * 180 },
      data: {
        label: (
          <div className="text-left">
            <div
              className="text-[10px] font-mono uppercase tracking-wider mb-1"
              style={{ color: typeColors[e.source] }}
            >
              {e.source} · {e.time}
            </div>
            <div className="text-xs font-display text-zinc-100 leading-tight">{e.title}</div>
            <div className="text-[10px] text-zinc-400 mt-1 font-mono">{toLocString(e.location)}</div>
          </div>
        ),
      },
      style: {
        background: '#0a0d14',
        border: `1px solid ${typeColors[e.source] || '#1f2937'}40`,
        borderRadius: 10,
        padding: 10,
        width: 200,
        boxShadow: e.severity === 'critical' ? `0 0 16px ${typeColors.anomaly}40` : 'none',
      },
    }));

    const eds = events.slice(0, -1).map((e, i) => ({
      id: `edge-${i}`,
      source: e.id,
      target: events[i + 1].id,
      animated: events[i + 1].severity === 'critical',
      style: {
        stroke: events[i + 1].severity === 'critical' ? '#ff3358' : '#1f2937',
        strokeWidth: 1.5,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3f3f46' },
    }));

    return { nodes: nds, edges: eds };
  }, [events]);

  const sources = ['all', 'cctv', 'phone', 'gps', 'call', 'social', 'anomalies'];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 03"
        title="Timeline & Evidence Correlation"
        description="Multi-source event reconstruction with anomaly detection across CCTV, telephony, GPS and social signals."
        badge={{
          label: isLive ? 'Live · reconstructed' : 'Demo mode',
          tone: isLive ? 'green' : 'cyan',
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
          {cases.length === 0 && <option value="">No cases — using demo</option>}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_number} · {c.title?.slice(0, 50)}
            </option>
          ))}
        </select>
      </div>

      {/* Filter bar */}
      <div className="panel p-3 flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-zinc-500 ml-2" />
        <span className="text-xs font-mono text-zinc-500 uppercase mr-2">Filter source</span>
        {sources.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition ${
              filter === s
                ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40'
                : 'text-zinc-400 border border-ink-800 hover:border-ink-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* React Flow graph */}
        <div className="lg:col-span-2 panel p-0 overflow-hidden h-[560px]">
          <div className="px-5 py-3 border-b border-ink-800 flex items-center justify-between">
            <div>
              <p className="section-label">Event Relationship Graph</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Drag, zoom and pan. Animated edges flag anomalies.
              </p>
            </div>
            <span className="text-xs font-mono text-neon-cyan">
              {events.length} events linked
            </span>
          </div>
          <div className="h-[500px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#1a2030" gap={20} size={1} />
              <Controls className="!bg-ink-900 !border-ink-800" />
            </ReactFlow>
          </div>
        </div>

        {/* Linear event list */}
        <div className="space-y-3">
          <Card title="Chronological Stream" eyebrow="Linear timeline" delay={0.1}>
            <div className="relative pl-5 space-y-4 max-h-[480px] overflow-y-auto pr-2">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-ink-800" />
              {events.map((e, i) => {
                const Icon = typeIcons[e.source] || Clock;
                return (
                  <motion.button
                    key={e.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedEvent(e)}
                    className={`relative w-full text-left group ${
                      selectedEvent?.id === e.id ? 'opacity-100' : ''
                    }`}
                  >
                    <span
                      className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full border-2 border-ink-950"
                      style={{ background: typeColors[e.source] || '#71717a' }}
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3 h-3 text-zinc-500" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        {e.time}
                      </span>
                      {e.severity && <ThreatBadge level={e.severity} />}
                    </div>
                    <p className="text-sm text-zinc-200 group-hover:text-neon-cyan transition leading-snug">
                      {e.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">{toLocString(e.location)}</p>
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Detail panel */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-5 corner-brackets"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="section-label">Event detail</p>
              <p className="font-display text-xl text-zinc-100 mt-1">{selectedEvent.title}</p>
              <p className="text-sm text-zinc-400 mt-1 font-mono">
                {selectedEvent.time} · {toLocString(selectedEvent.location)}
              </p>
            </div>
            <ThreatBadge level={selectedEvent.severity || 'info'} />
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{selectedEvent.description}</p>
          {selectedEvent.evidence_ids && (
            <div className="mt-4 pt-4 border-t border-ink-800">
              <p className="text-xs font-mono uppercase text-zinc-500 mb-2">Linked evidence</p>
              <div className="flex flex-wrap gap-2">
                {selectedEvent.evidence_ids.map((id) => (
                  <span
                    key={id}
                    className="px-2 py-1 bg-ink-900 border border-ink-800 rounded text-xs font-mono text-neon-cyan"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
