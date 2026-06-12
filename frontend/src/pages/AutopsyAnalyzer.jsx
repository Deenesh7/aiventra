import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSearch,
  AlertCircle,
  ChevronRight,
  Brain,
  Beaker,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { Card } from '../components/Card.jsx';
import Dropzone from '../components/Dropzone.jsx';
import ThreatBadge from '../components/ThreatBadge.jsx';
import { LoadingDots } from '../components/Loaders.jsx';
import { reportsApi } from '../services/api.js';
import { cloudinaryService } from '../services/cloudinary.js';
import { evidenceService, analysisService } from '../services/firestore.js';
import { mockReportSummary } from '../data/mockData.js';
import toast from 'react-hot-toast';

export default function AutopsyAnalyzer() {
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);

  // For demo we attach to a default case; real flow would receive caseId via prop/route.
  const defaultCaseId = 'AIV-2026-0118';

  const analyze = async () => {
    if (!files.length) {
      toast.error('Upload a report first');
      return;
    }
    setAnalyzing(true);
    setResult(null);
    setUploadPct(0);

    const file = files[0];
    let uploaded = null;

    // 1) Upload to Cloudinary (non-fatal if not configured)
    try {
      uploaded = await cloudinaryService.uploadEvidence({
        caseId: defaultCaseId,
        file,
        onProgress: setUploadPct,
      });
    } catch (e) {
      console.warn('[autopsy] cloud upload skipped:', e?.message || e);
    }

    // 2) Create evidence record in Firestore (non-fatal)
    try {
      if (uploaded) {
        await evidenceService.create({
          caseId: defaultCaseId,
          type: 'document',
          name: file.name,
          description: 'Autopsy report — uploaded for NLP analysis',
          fileUrl: uploaded.url,
          storagePath: uploaded.publicId,
          metadata: {
            size: uploaded.bytes,
            format: uploaded.format,
            resourceType: uploaded.resourceType,
            provider: 'cloudinary',
          },
        });
      }
    } catch (e) {
      console.warn('[autopsy] evidence record creation skipped:', e?.code || e);
    }

    // 3) Run AI analysis on FastAPI
    try {
      const data = await reportsApi.analyze(file, defaultCaseId);
      setResult(data);
      toast.success('Analysis complete');

      // 4) Persist the analysis to Firestore (non-fatal)
      try {
        await analysisService.save({
          caseId: defaultCaseId,
          type: 'autopsy',
          payload: data,
          summary: data?.cause_of_death?.primary || 'Autopsy analyzed',
          provider: data?.deep_reasoning?.provider,
          model: data?.deep_reasoning?.model,
        });
      } catch (e) {
        console.warn('[autopsy] Firestore save skipped:', e?.code || e);
      }
    } catch (e) {
      console.warn('[autopsy] AI backend unreachable, using mock:', e?.message);
      await new Promise((r) => setTimeout(r, 1500));
      setResult(mockReportSummary);
      toast.success('Demo analysis complete (AI backend offline)');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="◆ Module 01"
        title="AI Autopsy Report Analyzer"
        description="Upload autopsy PDFs. NLP and OCR extract cause of death, injury patterns, toxicology and suspicious indicators."
        badge={<span className="badge badge-info">NLP · OCR</span>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload column */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Upload Report" icon={FileSearch} delay={0}>
            <Dropzone
              files={files}
              onFiles={(f) => setFiles(f)}
              onRemove={(idx) => setFiles(files.filter((_, i) => i !== idx))}
              accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }}
              hint="PDF or scanned image of autopsy report"
            />
            <button
              onClick={analyze}
              disabled={analyzing || !files.length}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {analyzing ? <LoadingDots label="Analyzing" /> : <>Run AI Analysis <ChevronRight size={14} /></>}
            </button>
          </Card>

          <Card title="Pipeline" delay={0.1}>
            <ol className="space-y-3 text-xs">
              {[
                { n: '01', t: 'OCR extraction', d: 'Tesseract over scanned PDF' },
                { n: '02', t: 'NER & section parsing', d: 'spaCy medical model' },
                { n: '03', t: 'Forensic classifier', d: 'Domain-tuned transformer' },
                { n: '04', t: 'Indicator scoring', d: 'Suspicious pattern detection' },
              ].map((s) => (
                <li key={s.n} className="flex gap-3">
                  <div className="font-mono text-[10px] text-neon-cyan w-8 flex-shrink-0 pt-0.5">{s.n}</div>
                  <div>
                    <div className="font-medium">{s.t}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <div className="panel p-4 border-neon-amber/20 bg-neon-amber/5">
            <div className="flex gap-2">
              <AlertCircle size={14} className="text-neon-amber flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-neon-amber/90 leading-relaxed">
                AI output is investigation-assistance only. Must be reviewed by a qualified forensic pathologist.
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !analyzing && (
            <div className="panel p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-neon-cyan/5 border border-neon-cyan/20 flex items-center justify-center mb-4">
                <Brain size={24} className="text-neon-cyan/50" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Awaiting Report</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Upload an autopsy report to begin AI-powered forensic extraction and analysis.
              </p>
            </div>
          )}

          {analyzing && (
            <div className="panel p-12 text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-neon-cyan/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-cyan animate-spin" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 gradient-text">Running Forensic Analysis</h3>
              <p className="text-sm text-slate-400">Extracting structured forensic intelligence from unstructured text…</p>
              <div className="mt-6 max-w-md mx-auto space-y-1.5 text-left">
                {['OCR extraction', 'Section parsing', 'Entity recognition', 'Indicator scoring'].map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.4 }}
                    className="flex items-center gap-2 text-[11px] font-mono text-slate-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                    {s}…
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Header */}
              <div className="panel p-5 border-neon-cyan/20">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-cyan/80 mb-1">
                      Forensic Summary
                    </div>
                    <h3 className="font-display font-bold text-xl">
                      {result.case_id || defaultCaseId}
                    </h3>
                    {result.pathologist && (
                      <p className="text-xs font-mono text-slate-400 mt-1">
                        Examining pathologist: {result.pathologist}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {result.deep_reasoning?.provider && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          LLM
                        </div>
                        <div className="font-mono text-xs text-neon-cyan">
                          {result.deep_reasoning.provider} · {result.deep_reasoning.model}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        Confidence
                      </div>
                      <div className="font-display text-2xl font-bold gradient-text">
                        {typeof result.confidence === 'number'
                          ? result.confidence > 1
                            ? `${result.confidence}%`
                            : `${Math.round(result.confidence * 100)}%`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Card title="Cause of Death" icon={ShieldAlert} delay={0.1}>
                <p className="text-sm leading-relaxed">
                  {typeof result.cause_of_death === 'string'
                    ? result.cause_of_death
                    : result.cause_of_death?.primary || 'Undetermined'}
                </p>
                {result.cause_of_death?.evidence_quote && (
                  <p className="text-xs font-mono text-slate-400 mt-3 pl-3 border-l-2 border-neon-cyan/40 italic">
                    "{result.cause_of_death.evidence_quote.slice(0, 240)}"
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Category:
                  </span>
                  <span className="badge badge-high">
                    {result.cause_of_death?.category || result.manner || 'undetermined'}
                  </span>
                </div>
              </Card>

              {/* DEEP FORENSIC REASONING — full LLM narrative */}
              {result.deep_reasoning?.narrative && (
                <Card
                  title="🧠 Deep Forensic Reasoning"
                  icon={Brain}
                  delay={0.12}
                  className="border-neon-cyan/30"
                >
                  <div className="text-xs font-mono text-neon-cyan/70 mb-2 uppercase tracking-wider">
                    {result.deep_reasoning.provider === 'gemini'
                      ? 'Gemini 1.5 Flash · forensic analyst persona'
                      : result.deep_reasoning.provider === 'ollama'
                      ? 'Local TinyLlama · forensic analyst persona'
                      : 'Templated fallback — configure GEMINI_API_KEY for full reasoning'}
                    {' · '}
                    {result.deep_reasoning.inference_ms}ms
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-200 max-h-[600px] overflow-y-auto pr-2">
                    {result.deep_reasoning.narrative}
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card title="Injury Patterns" icon={Activity} delay={0.15}>
                  <ul className="space-y-2">
                    {(result.injury_patterns || []).map((p, i) => (
                      <li
                        key={i}
                        className="text-sm p-2.5 rounded bg-ink-900/40 border border-white/5"
                      >
                        {typeof p === 'string' ? (
                          <span>{p}</span>
                        ) : (
                          <div className="flex items-start gap-2">
                            <ThreatBadge level={p.severity || 'medium'} />
                            <div className="flex-1">
                              {p.region && (
                                <div className="font-mono text-[10px] uppercase tracking-wider text-neon-cyan/80 mb-0.5">
                                  {p.region}
                                </div>
                              )}
                              <div>{p.description || p.pattern || ''}</div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card title="Toxicology" icon={Beaker} delay={0.2}>
                  <ul className="space-y-2">
                    {(result.toxicology || []).map((t, i) => (
                      <li
                        key={i}
                        className="text-sm p-2.5 rounded bg-ink-900/40 border border-white/5"
                      >
                        {typeof t === 'string' ? (
                          <span>{t}</span>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{t.substance}</span>
                            <span className="font-mono text-xs text-slate-300">{t.value}</span>
                            <span
                              className={`badge ${
                                t.status === 'positive' ? 'badge-high' : 'badge-low'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <Card title="Medical Observations" delay={0.25}>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(result.observations || result.medical_observations || []).map((o, i) => (
                    <li
                      key={i}
                      className="text-sm p-2.5 rounded bg-ink-900/40 border border-white/5"
                    >
                      {o}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card
                title="⚠ Suspicious Indicators"
                icon={AlertCircle}
                delay={0.3}
                className="border-neon-red/20"
              >
                <ul className="space-y-2">
                  {(result.suspicious_indicators || []).map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-3 rounded bg-ink-900/40 border border-white/5"
                    >
                      <ThreatBadge level={s.severity || 'medium'} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {s.indicator || s.text || ''}
                        </div>
                        {s.note && (
                          <div className="text-xs text-slate-400 mt-1">{s.note}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
