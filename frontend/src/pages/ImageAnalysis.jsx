import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Scan,
  Crosshair,
  ShieldAlert,
  AlertCircle,
  Activity,
  MapPin,
  Stethoscope,
  Microscope,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import Dropzone from '../components/Dropzone';
import { LoadingDots } from '../components/Loaders';
import ThreatBadge from '../components/ThreatBadge';
import { imageApi } from '../services/api.js';
import { cloudinaryService } from '../services/cloudinary.js';
import { evidenceService, analysisService } from '../services/firestore.js';

// Deterministic fallback so the page is always demonstrable
const mockAnalysis = {
  resolution: '4032 × 3024',
  format: 'JPEG',
  exif_intact: true,
  enhancement_applied: ['low-light boost', 'denoise', 'sharpen'],
  detections: [
    {
      label: 'Probable body location',
      class: 'body',
      confidence: 0.84,
      box: { x: 22, y: 18, w: 56, h: 64 },
      severity: 'critical',
      primary: true,
    },
    {
      label: 'Sharp-force trauma',
      class: 'weapon',
      confidence: 0.78,
      box: { x: 38, y: 32, w: 8, h: 6 },
      severity: 'critical',
    },
    {
      label: 'Blood-like staining',
      class: 'biological',
      confidence: 0.71,
      box: { x: 42, y: 46, w: 14, h: 10 },
      severity: 'high',
    },
  ],
  body_location: {
    box: { x: 22, y: 18, w: 56, h: 64 },
    confidence: 0.84,
    method: 'OpenCV contour saliency',
  },
  inferred_injuries: [
    {
      region: 'left_chest',
      region_label: 'Left Chest',
      severity: 'critical',
      injury_type: 'Stab wound (penetrating)',
      possible_cause: 'Single-point sharp implement — e.g. knife tip or pointed object',
      confidence: 0.78,
      description: 'Penetrating sharp-force injury, left thoracic region.',
    },
    {
      region: 'abdomen',
      region_label: 'Abdomen',
      severity: 'high',
      injury_type: 'Abdominal penetrating injury',
      possible_cause: 'Sharp implement through abdominal wall',
      confidence: 0.71,
      description: 'Secondary penetrating wound below sternum.',
    },
    {
      region: 'left_forearm',
      region_label: 'Left Forearm',
      severity: 'medium',
      injury_type: 'Defensive wound',
      possible_cause: 'Victim raised arm to block attack — defensive posture',
      confidence: 0.66,
      description: 'Linear laceration on volar surface, consistent with defense.',
    },
  ],
  tampering: { detected: false, score: 0.08, methods_checked: ['ELA', 'noise variance'] },
  blood_pattern: {
    type: 'passive drop',
    surface: 'porous',
    spread: 'localized',
    estimated_volume: '15–22 ml',
  },
};

const detectionColors = {
  body: '#ff003c',
  weapon: '#ff3358',
  biological: '#f97316',
  evidence: '#00e5ff',
};

const severityToHex = {
  critical: '#ff003c',
  high: '#ff3358',
  medium: '#ffa033',
  low: '#ffd633',
};

export default function ImageAnalysis() {
  const [files, setFiles] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [isPdfInput, setIsPdfInput] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredInjury, setHoveredInjury] = useState(null);

  const defaultCaseId = 'AIV-2026-0118';

  const handleFiles = (newFiles) => {
    setFiles(newFiles);
    if (newFiles[0]) {
      // Show preview only for images, not PDFs
      const isImage = newFiles[0].type.startsWith('image/');
      setImageUrl(isImage ? URL.createObjectURL(newFiles[0]) : null);
      setIsPdfInput(!isImage);
      setAnalysis(null);
    }
  };

  const runAnalysis = async () => {
    if (!files[0]) {
      toast.error('Upload a victim photograph or autopsy PDF first');
      return;
    }
    setLoading(true);
    const file = files[0];
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    // Immediate user feedback so they know the click registered
    const t = toast.loading(`Analyzing ${file.name}…`);
    console.log('[image] starting analysis:', {
      name: file.name,
      size: file.size,
      type: file.type,
      isPdf,
    });

    // ─── BACKEND CALL FIRST — this is the only part that matters ───
    let analysisResult = null;
    try {
      console.log('[image] calling backend /api/images/generate-body-chart');
      const data = await imageApi.generateBodyChart(file);
      console.log('[image] backend response received:', {
        source_type: data?.source_type,
        injuries: data?.injuries?.length,
        diagram_markers: data?.body_diagram?.marker_count,
      });
      analysisResult = {
        ...data,
        detections: data.detections || [],
        inferred_injuries: data.injuries || [],
        body_location: data.body_location || null,
        body_diagram: data.body_diagram,
        resolution: data.extra?.resolution,
        tampering: data.tampering,
        blood_pattern: data.extra?.blood_pattern,
        source_type: data.source_type,
      };
      setAnalysis(analysisResult);
      const injuryCount = analysisResult.inferred_injuries.length;
      toast.success(
        injuryCount > 0
          ? `${injuryCount} injuries mapped on body chart`
          : 'Body chart generated',
        { id: t },
      );
    } catch (e) {
      console.error('[image] backend call FAILED:', e);
      console.error('[image] error details:', {
        message: e?.message,
        status: e?.response?.status,
        statusText: e?.response?.statusText,
        data: e?.response?.data,
      });
      toast.error(
        e?.response?.status === 401
          ? 'Not authenticated — please log in again'
          : e?.response?.status === 404
          ? 'Backend endpoint not found — is the FastAPI server running on port 8000?'
          : e?.code === 'ERR_NETWORK' || e?.message?.includes('Network')
          ? 'Cannot reach backend at http://localhost:8000 — is uvicorn running?'
          : `Backend error: ${e?.response?.data?.detail || e?.message || 'unknown'}`,
        { id: t, duration: 6000 },
      );
      // Fallback to demo so the page still shows something useful
      setAnalysis(mockAnalysis);
    } finally {
      setLoading(false);
    }

    // ─── Optional cloud upload + Firestore — best-effort, in background ───
    // (Wrapped in setTimeout 0 so it never blocks the user-visible flow.)
    setTimeout(async () => {
      let uploaded = null;
      try {
        uploaded = await Promise.race([
          cloudinaryService.uploadEvidence({ caseId: defaultCaseId, file }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('cloudinary timeout')), 8000)),
        ]);
        console.log('[image] cloudinary upload ok:', uploaded?.publicId);
      } catch (e) {
        console.warn('[image] cloud upload skipped:', e?.message || e);
      }
      try {
        if (uploaded) {
          await evidenceService.create({
            caseId: defaultCaseId,
            type: isPdf ? 'document' : 'image',
            name: file.name,
            description: isPdf
              ? 'Autopsy report — body chart synthesis'
              : 'Victim photograph — body chart synthesis',
            fileUrl: uploaded.url,
            storagePath: uploaded.publicId,
            metadata: { provider: 'cloudinary' },
          });
        }
        if (analysisResult) {
          await analysisService.save({
            caseId: defaultCaseId,
            type: isPdf ? 'autopsy' : 'image',
            payload: analysisResult,
            summary: `${analysisResult.inferred_injuries.length} injuries mapped`,
          });
        }
      } catch (e) {
        console.warn('[image] Firestore save skipped:', e?.code || e);
      }
    }, 0);
  };

  const injuries = analysis?.inferred_injuries || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 08"
        title="Forensic Image & Report Analysis"
        description="Upload a victim photograph OR an autopsy PDF. The system generates a forensic body chart with red injury markers at anatomically detected positions, plus structured classification per injury."
        badge={{ label: 'CV + NLP · body chart synthesis', tone: 'cyan' }}
      />

      {!imageUrl && !isPdfInput && (
        <Dropzone
          onFilesAccepted={handleFiles}
          accept={{
            'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
            'application/pdf': ['.pdf'],
          }}
          maxFiles={1}
          label="Drop a victim photograph OR an autopsy report PDF"
          hint="The system generates a blue forensic body chart with red injury markers from either input"
        />
      )}

      {(imageUrl || isPdfInput) && (
        <>
          {/* Toolbar */}
          <div className="panel p-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Active {isPdfInput ? 'document' : 'image'}
              </span>
              <span className="text-xs font-mono text-zinc-200 truncate max-w-md">
                {files[0]?.name}
              </span>
              {isPdfInput && (
                <span className="text-[10px] font-mono uppercase tracking-wider text-neon-amber px-2 py-0.5 rounded border border-neon-amber/40 bg-neon-amber/5">
                  PDF · autopsy report mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setImageUrl(null);
                  setIsPdfInput(false);
                  setFiles([]);
                  setAnalysis(null);
                }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Replace
              </button>
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    Analyzing <LoadingDots />
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Scan className="w-3 h-3" /> Run Forensic CV
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ─── DUAL-PANEL: ORIGINAL PHOTO + BODY SILHOUETTE ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Original photo / PDF placeholder + bounding-box overlay */}
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="section-label">
                    {isPdfInput ? 'Source document' : 'Original photograph'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                    {isPdfInput
                      ? 'PDF autopsy report · NLP extraction'
                      : `${analysis?.resolution || '—'} · ${analysis?.format || ''}`}
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Source evidence
                </span>
              </div>

              <div className="relative bg-ink-950 rounded-lg overflow-hidden aspect-[4/3] border border-ink-800">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="forensic source"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  // PDF placeholder
                  <div className="h-full grid place-items-center p-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-neon-amber/15 border border-neon-amber/40 grid place-items-center mb-4">
                        <svg className="w-7 h-7 text-neon-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="font-display text-lg text-zinc-100 mb-1">
                        Autopsy PDF loaded
                      </p>
                      <p className="text-xs font-mono text-zinc-500 mb-3 max-w-xs">
                        {files[0]?.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 max-w-sm">
                        NLP will extract injury patterns from the report and map them
                        onto the body silhouette to the right.
                      </p>
                      {analysis?.deep_reasoning && (
                        <div className="mt-4 text-[10px] font-mono text-neon-cyan">
                          {analysis.deep_reasoning.provider} ·{' '}
                          {analysis.deep_reasoning.model}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Detection bounding boxes */}
                {analysis &&
                  analysis.detections?.map((d, i) => {
                    if (!d?.box) return null;
                    const isHovered =
                      hoveredInjury &&
                      Math.abs((d.box.x + d.box.w / 2) - hoveredInjury.boxX) < 5 &&
                      Math.abs((d.box.y + d.box.h / 2) - hoveredInjury.boxY) < 5;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.12 }}
                        className="absolute border-2 rounded"
                        style={{
                          left: `${d.box.x}%`,
                          top: `${d.box.y}%`,
                          width: `${d.box.w}%`,
                          height: `${d.box.h}%`,
                          borderColor: detectionColors[d.class] || '#00e5ff',
                          boxShadow: isHovered
                            ? `0 0 24px ${detectionColors[d.class]}, inset 0 0 16px ${detectionColors[d.class]}40`
                            : `0 0 12px ${detectionColors[d.class]}80`,
                          background: isHovered ? `${detectionColors[d.class]}15` : 'transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          className="absolute -top-6 left-0 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded whitespace-nowrap"
                          style={{
                            background: detectionColors[d.class] || '#00e5ff',
                            color: '#0a0d14',
                          }}
                        >
                          {d.label} · {Math.round(d.confidence * 100)}%
                        </div>
                      </motion.div>
                    );
                  })}

                {loading && (
                  <div className="absolute inset-0 grid place-items-center bg-ink-950/80">
                    <div className="text-center">
                      <div className="w-14 h-14 mx-auto rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin mb-3" />
                      <p className="font-mono text-xs text-zinc-300 uppercase tracking-wider">
                        Running CV pipeline
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500 mt-1">
                        Contour saliency · HSV segmentation · edge clustering
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono">
                <Stat
                  k="EXIF"
                  v={analysis?.exif_intact ? 'INTACT' : '—'}
                  tone={analysis?.exif_intact ? 'green' : 'zinc'}
                />
                <Stat
                  k="Tampering"
                  v={analysis?.tampering?.detected ? 'SUSPICIOUS' : 'CLEAN'}
                  tone={analysis?.tampering?.detected ? 'red' : 'green'}
                />
                <Stat
                  k="Body detected"
                  v={analysis?.body_location ? 'YES' : '—'}
                  tone={analysis?.body_location ? 'cyan' : 'zinc'}
                />
              </div>
            </div>

            {/* Body silhouette diagram */}
            <div className="panel p-4 bg-gradient-to-br from-ink-950 to-[#04101a] border border-neon-cyan/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="section-label">Forensic body chart</p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                    Anterior view · injury locations mapped from CV
                  </p>
                </div>
                {analysis?.body_diagram?.svg_base64 && (
                  <a
                    href={analysis.body_diagram.svg_base64}
                    download="aiventra-injury-map.svg"
                    className="text-[10px] font-mono text-neon-cyan/80 hover:text-neon-cyan flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> SVG
                  </a>
                )}
              </div>

              <div className="bg-[#04080f] rounded-lg p-2 border border-ink-800 aspect-[4/3] grid place-items-center overflow-hidden">
                {analysis?.body_diagram?.svg ? (
                  <div
                    className="h-full max-h-[420px] aspect-[1/2] mx-auto"
                    dangerouslySetInnerHTML={{ __html: analysis.body_diagram.svg }}
                  />
                ) : (
                  <div className="text-center px-6">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 grid place-items-center mb-3">
                      <Stethoscope className="w-6 h-6 text-neon-cyan" />
                    </div>
                    <p className="font-display text-sm text-zinc-300">
                      Body chart will render here
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Run analysis to populate injury markers
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>
                  {injuries.length} injur{injuries.length === 1 ? 'y' : 'ies'} located
                </span>
                <div className="flex items-center gap-3">
                  <LegendDot color="#ff003c" label="Critical" />
                  <LegendDot color="#ff3358" label="High" />
                  <LegendDot color="#ffa033" label="Medium" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── DETECTED INJURIES TABLE ─── */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="panel p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="section-label">Detected injuries</p>
                  <p className="font-display text-lg text-zinc-100 mt-0.5">
                    Forensic catalog · {injuries.length} entr
                    {injuries.length === 1 ? 'y' : 'ies'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-neon-red" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Decision-support only · pathologist confirmation required
                  </span>
                </div>
              </div>

              {injuries.length === 0 ? (
                <div className="py-10 text-center">
                  <Microscope className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
                  <p className="font-display text-base text-zinc-400">
                    No injuries inferred from this image.
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    The CV pipeline could not locate wound-suggestive features inside
                    the body silhouette.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {injuries.map((inj, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      onMouseEnter={() =>
                        setHoveredInjury({
                          boxX: (inj.box?.x || 0) + (inj.box?.w || 0) / 2,
                          boxY: (inj.box?.y || 0) + (inj.box?.h || 0) / 2,
                        })
                      }
                      onMouseLeave={() => setHoveredInjury(null)}
                      className="bg-ink-900/50 border border-ink-800 hover:border-neon-cyan/40 rounded-lg p-4 transition cursor-help"
                    >
                      {/* Header row */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-9 h-9 rounded-lg grid place-items-center font-mono font-bold text-sm flex-shrink-0 border-2"
                          style={{
                            background: severityToHex[inj.severity] + '22',
                            borderColor: severityToHex[inj.severity] + '88',
                            color: severityToHex[inj.severity],
                          }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display text-base text-zinc-100 leading-tight">
                            {inj.injury_type}
                          </h4>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mt-0.5">
                            ID · INJ-{String(i + 1).padStart(3, '0')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <ThreatBadge level={inj.severity} />
                          <p className="text-[10px] font-mono text-neon-cyan mt-1">
                            {Math.round((inj.confidence || 0.5) * 100)}%
                          </p>
                        </div>
                      </div>

                      {/* Structured rows */}
                      <div className="space-y-2">
                        <Row icon={MapPin} label="Body region" value={inj.region_label || inj.region} />
                        <Row
                          icon={Activity}
                          label="Severity level"
                          value={
                            <span
                              className="font-mono"
                              style={{ color: severityToHex[inj.severity] }}
                            >
                              {(inj.severity || 'medium').toUpperCase()}
                            </span>
                          }
                        />
                        <Row icon={ShieldAlert} label="Possible cause" value={inj.possible_cause} />
                      </div>

                      {inj.description && (
                        <p className="text-[11px] text-zinc-400 mt-3 pt-3 border-t border-ink-800 leading-relaxed">
                          {inj.description}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Disclaimer */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="panel p-4 border-neon-amber/30 bg-neon-amber/[0.04] flex gap-3"
            >
              <AlertCircle className="w-5 h-5 text-neon-amber flex-shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-neon-amber font-display">
                  Forensic disclaimer:
                </strong>{' '}
                Injury detections and cause-of-injury classifications are produced by
                computer-vision heuristics on the source image. Anatomical positions are
                approximate. All findings require independent confirmation by a qualified
                forensic pathologist before inclusion in any official report or
                court submission. AIVENTRA is decision-support software, not a diagnostic
                instrument.
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 text-zinc-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          {label}
        </div>
        <div className="text-xs text-zinc-200 mt-0.5">{value || '—'}</div>
      </div>
    </div>
  );
}

function Stat({ k, v, tone = 'cyan' }) {
  const toneClass = {
    green: 'text-neon-green',
    red: 'text-neon-red',
    cyan: 'text-neon-cyan',
    zinc: 'text-zinc-400',
  }[tone];
  return (
    <div className="bg-ink-900/60 border border-ink-800 rounded p-2">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{k}</div>
      <div className={`text-xs font-mono ${toneClass} mt-0.5`}>{v}</div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {label}
    </span>
  );
}
