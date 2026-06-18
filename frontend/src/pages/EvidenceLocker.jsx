import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  FileText,
  Image as ImageIcon,
  AudioLines,
  Package,
  Upload,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  User as UserIcon,
  Filter,
  Search,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import { cloudinaryService } from '../services/cloudinary.js';
import { evidenceService } from '../services/firestore.js';

// ─── Evidence type cards ─────────────────────────────────────────────────────
const EVIDENCE_TYPES = [
  {
    id: 'video',
    label: 'Camera Footage',
    description: 'CCTV recordings, body-cam, dash-cam, witness mobile video',
    accept: 'video/*',
    icon: Video,
    color: 'cyan',
    hint: 'MP4 · MOV · WEBM · AVI',
    typeForFirestore: 'video',
  },
  {
    id: 'document',
    label: 'Reports & Documents',
    description: 'Autopsy reports, witness statements, lab results, warrants',
    accept: '.pdf,.doc,.docx,.txt,.rtf,application/pdf',
    icon: FileText,
    color: 'amber',
    hint: 'PDF · DOC · DOCX · TXT',
    typeForFirestore: 'document',
  },
  {
    id: 'image',
    label: 'Scene Photographs',
    description: 'Crime scene photos, evidence shots, victim photographs',
    accept: 'image/*',
    icon: ImageIcon,
    color: 'green',
    hint: 'JPG · PNG · HEIC · WEBP',
    typeForFirestore: 'image',
  },
  {
    id: 'audio',
    label: 'Audio Recordings',
    description: 'Interrogations, 911 calls, intercepts, voice memos',
    accept: 'audio/*',
    icon: AudioLines,
    color: 'violet',
    hint: 'MP3 · WAV · M4A · OGG',
    typeForFirestore: 'audio',
  },
  {
    id: 'other',
    label: 'Other Evidence',
    description: 'Phone dumps, GPS data, archives, forensic exports',
    accept: '*/*',
    icon: Package,
    color: 'red',
    hint: 'ZIP · JSON · CSV · raw files',
    typeForFirestore: 'other',
  },
];

const COLOR_MAP = {
  cyan: { border: 'border-neon-cyan/30', bg: 'bg-neon-cyan/10', text: 'text-neon-cyan', ring: 'ring-neon-cyan/40' },
  amber: { border: 'border-neon-amber/30', bg: 'bg-neon-amber/10', text: 'text-neon-amber', ring: 'ring-neon-amber/40' },
  green: { border: 'border-neon-green/30', bg: 'bg-neon-green/10', text: 'text-neon-green', ring: 'ring-neon-green/40' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400', ring: 'ring-violet-400/40' },
  red: { border: 'border-neon-red/30', bg: 'bg-neon-red/10', text: 'text-neon-red', ring: 'ring-neon-red/40' },
};

// Helper to format byte size
const formatBytes = (b) => {
  if (!b) return '–';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const typeIconFor = (t) => {
  switch (t) {
    case 'video': return Video;
    case 'audio': return AudioLines;
    case 'image': return ImageIcon;
    case 'document': return FileText;
    default: return Package;
  }
};

// ─── Main page ───────────────────────────────────────────────────────────────
export default function EvidenceLocker() {
  const [activeUploads, setActiveUploads] = useState([]); // { id, type, file, progress, status, error }
  const [evidence, setEvidence] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const defaultCaseId = 'AIV-2026-0118';

  // Load evidence list on mount
  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    setLoadingList(true);
    try {
      const list = await evidenceService.listForCase(defaultCaseId);
      setEvidence(list || []);
    } catch (e) {
      console.warn('[evidence] list failed, using empty:', e?.message);
      setEvidence([]);
    } finally {
      setLoadingList(false);
    }
  };

  // ── Handle file selection per evidence card ──────────────────────────────
  const handleFileSelect = (evidenceType, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    files.forEach((file) => {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const initial = {
        id: uploadId,
        type: evidenceType,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading', // uploading | success | error
        error: null,
      };
      setActiveUploads((u) => [...u, initial]);
      uploadOne(uploadId, evidenceType, file);
    });
  };

  // ── Upload + persist a single file ──────────────────────────────────────
  const uploadOne = async (uploadId, evidenceType, file) => {
    const u = (patch) =>
      setActiveUploads((prev) =>
        prev.map((x) => (x.id === uploadId ? { ...x, ...patch } : x)),
      );

    let uploaded = null;
    try {
      // 1. Cloudinary upload
      uploaded = await cloudinaryService.uploadEvidence({
        caseId: defaultCaseId,
        file,
        onProgress: (p) => u({ progress: p }),
      });

      // 2. Firestore evidence record
      const created = await evidenceService.create({
        caseId: defaultCaseId,
        type: evidenceType.typeForFirestore,
        name: file.name,
        description: `${evidenceType.label} · uploaded via Evidence Locker`,
        fileUrl: uploaded.url,
        storagePath: uploaded.publicId,
        metadata: {
          provider: 'cloudinary',
          bytes: uploaded.bytes,
          format: uploaded.format,
          resource_type: uploaded.resourceType,
        },
      });

      u({ status: 'success', progress: 100 });
      toast.success(`${evidenceType.label} uploaded · ${file.name}`);

      // Refresh list so the new item shows in the table
      setEvidence((prev) => [
        {
          id: created.id,
          ...created,
          collected_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Auto-remove finished item after 4s
      setTimeout(() => {
        setActiveUploads((prev) => prev.filter((x) => x.id !== uploadId));
      }, 4000);
    } catch (e) {
      console.error('[evidence] upload failed:', e);
      u({
        status: 'error',
        error: e?.message || 'Upload failed',
      });
      toast.error(`Upload failed: ${file.name}`);
    }
  };

  const removeUpload = (id) =>
    setActiveUploads((prev) => prev.filter((x) => x.id !== id));

  // ── Filter + search evidence list ───────────────────────────────────────
  const filteredEvidence = evidence.filter((e) => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (e.name || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.collected_by || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 12"
        title="Evidence Locker"
        description="Chain-of-custody-tracked evidence intake. Drop any file type into the matching card — videos, reports, photos, audio, or raw forensic data. Everything is logged to the case dossier with timestamp and investigator attribution."
        badge={{ label: 'Chain of Custody Enforced', tone: 'green' }}
      />

      {/* ─── Upload cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {EVIDENCE_TYPES.map((t) => (
          <UploadCard key={t.id} type={t} onFiles={(files) => handleFileSelect(t, files)} />
        ))}
      </div>

      {/* ─── Active uploads strip ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Upload size={14} className="text-neon-cyan" />
                  <span className="text-xs font-mono uppercase tracking-wider text-neon-cyan">
                    Active uploads · {activeUploads.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {activeUploads.map((u) => (
                  <UploadRow key={u.id} upload={u} onRemove={() => removeUpload(u.id)} />
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Evidence ledger ──────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wide">Case Evidence Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {evidence.length} {evidence.length === 1 ? 'item' : 'items'} on file for {defaultCaseId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search evidence…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan/60 w-44"
              />
            </div>
            {/* Filter */}
            <div className="relative">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-7 pr-7 py-1.5 bg-white/5 border border-white/10 rounded text-xs focus:outline-none focus:border-neon-cyan/60 appearance-none"
              >
                <option value="all">All types</option>
                <option value="video">Camera Footage</option>
                <option value="document">Reports</option>
                <option value="image">Photographs</option>
                <option value="audio">Audio</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {loadingList ? (
          <div className="text-center py-8 text-xs text-slate-500">Loading ledger…</div>
        ) : filteredEvidence.length === 0 ? (
          <div className="text-center py-12">
            <Package size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">
              {evidence.length === 0
                ? 'No evidence collected yet. Use the upload cards above to add evidence.'
                : 'No items match your search/filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredEvidence.map((e) => (
              <EvidenceRow key={e.id} item={e} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function UploadCard({ type, onFiles }) {
  const c = COLOR_MAP[type.color];
  const [dragging, setDragging] = useState(false);

  const onDrop = (ev) => {
    ev.preventDefault();
    setDragging(false);
    onFiles(ev.dataTransfer.files);
  };

  const fileInputId = `file-${type.id}`;

  return (
    <motion.label
      htmlFor={fileInputId}
      whileHover={{ y: -2 }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`
        relative cursor-pointer panel p-4 transition-all
        ${c.border} ${dragging ? `ring-2 ${c.ring}` : ''}
        hover:bg-white/5
      `}
    >
      <input
        id={fileInputId}
        type="file"
        accept={type.accept}
        multiple
        className="hidden"
        onChange={(ev) => {
          onFiles(ev.target.files);
          ev.target.value = '';
        }}
      />

      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <type.icon size={20} className={c.text} />
      </div>

      <h4 className={`text-sm font-semibold mb-1 ${c.text}`}>{type.label}</h4>
      <p className="text-[11px] text-slate-400 leading-snug mb-2">{type.description}</p>

      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500 mt-3 pt-3 border-t border-white/5">
        {type.hint}
      </div>
    </motion.label>
  );
}

function UploadRow({ upload, onRemove }) {
  const Icon = typeIconFor(upload.type.typeForFirestore);
  const isError = upload.status === 'error';
  const isDone = upload.status === 'success';

  return (
    <div className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded border border-white/5">
      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="truncate text-xs font-medium text-slate-200">{upload.name}</div>
          <div className="text-[10px] font-mono text-slate-500 flex-shrink-0">
            {formatBytes(upload.size)}
          </div>
        </div>
        {isError ? (
          <div className="flex items-center gap-1.5 text-[10px] text-neon-red">
            <AlertCircle size={10} />
            <span className="truncate">{upload.error}</span>
          </div>
        ) : (
          <div className="h-1 bg-white/5 rounded overflow-hidden">
            <motion.div
              animate={{ width: `${upload.progress}%` }}
              className={`h-full ${isDone ? 'bg-neon-green' : 'bg-neon-cyan'}`}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        {isDone ? (
          <CheckCircle2 size={14} className="text-neon-green" />
        ) : isError ? (
          <button onClick={onRemove} className="text-slate-500 hover:text-neon-red">
            <X size={14} />
          </button>
        ) : (
          <div className="text-[10px] font-mono text-neon-cyan">{upload.progress}%</div>
        )}
      </div>
    </div>
  );
}

function EvidenceRow({ item }) {
  const Icon = typeIconFor(item.type);
  const colorClass = {
    video: 'text-neon-cyan',
    document: 'text-neon-amber',
    image: 'text-neon-green',
    audio: 'text-violet-400',
    other: 'text-neon-red',
  }[item.type] || 'text-slate-400';

  const collectedAt = item.collected_at
    ? new Date(item.collected_at).toLocaleString()
    : '—';

  return (
    <div className="flex items-center gap-3 p-2.5 hover:bg-white/[0.02] rounded transition-colors border border-transparent hover:border-white/5">
      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className={colorClass} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-slate-200 truncate">{item.name || 'Unnamed'}</span>
          <span className={`text-[9px] font-mono uppercase tracking-wider ${colorClass}`}>
            {item.type}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <UserIcon size={9} />
            {item.collected_by || 'Investigator'}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={9} />
            {collectedAt}
          </span>
          {item.metadata?.bytes && (
            <span className="font-mono">{formatBytes(item.metadata.bytes)}</span>
          )}
        </div>
      </div>
      {item.file_url && (
        <a
          href={item.file_url}
          target="_blank"
          rel="noreferrer"
          className="text-slate-500 hover:text-neon-cyan transition-colors"
          title="Open file"
        >
          <Download size={14} />
        </a>
      )}
    </div>
  );
}
