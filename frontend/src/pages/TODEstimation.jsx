import { useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Activity, Droplets, Wind, Clock, AlertCircle, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import { LoadingDots } from '../components/Loaders';
import { todApi } from '../services/api';
import { analysisService } from '../services/firestore.js';
import { mockTODEstimate } from '../data/mockData';

const initialForm = {
  body_temperature: 32.4,
  ambient_temperature: 22.0,
  humidity: 55,
  rigor_mortis: 'partial',
  livor_mortis: 'fixed',
  body_weight: 72,
  clothing: 'light',
  location_type: 'indoor',
};

const fieldGroups = [
  {
    title: 'Thermal Readings',
    icon: Thermometer,
    fields: [
      { key: 'body_temperature', label: 'Body Temperature (°C)', type: 'number', step: 0.1, min: 15, max: 40 },
      { key: 'ambient_temperature', label: 'Ambient Temperature (°C)', type: 'number', step: 0.1, min: -10, max: 45 },
      { key: 'humidity', label: 'Relative Humidity (%)', type: 'number', step: 1, min: 0, max: 100 },
    ],
  },
  {
    title: 'Postmortem Signs',
    icon: Activity,
    fields: [
      {
        key: 'rigor_mortis',
        label: 'Rigor Mortis',
        type: 'select',
        options: ['absent', 'early', 'partial', 'complete', 'passing'],
      },
      {
        key: 'livor_mortis',
        label: 'Livor Mortis',
        type: 'select',
        options: ['absent', 'developing', 'fixed', 'maximum'],
      },
    ],
  },
  {
    title: 'Environmental Context',
    icon: Wind,
    fields: [
      { key: 'body_weight', label: 'Body Weight (kg)', type: 'number', step: 0.5, min: 30, max: 200 },
      {
        key: 'clothing',
        label: 'Clothing',
        type: 'select',
        options: ['none', 'light', 'normal', 'heavy', 'wrapped'],
      },
      {
        key: 'location_type',
        label: 'Location Type',
        type: 'select',
        options: ['indoor', 'outdoor', 'submerged', 'enclosed_vehicle'],
      },
    ],
  },
];

export default function TODEstimation() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEstimate = async () => {
    setLoading(true);
    const defaultCaseId = 'AIV-2026-0118';
    try {
      const data = await todApi.estimate(form);
      setResult(data);
      toast.success('TOD estimation complete');
      try {
        await analysisService.save({
          caseId: defaultCaseId,
          type: 'tod',
          payload: { input: form, output: data },
          summary: `PMI ${data.pmi_hours_low.toFixed(1)}–${data.pmi_hours_high.toFixed(1)}h (conf ${data.confidence}%)`,
        });
      } catch (e) {
        console.warn('[tod] Firestore save skipped:', e?.code || e);
      }
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      setResult(mockTODEstimate);
      toast.success('TOD estimation complete (demo data)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 02"
        title="Time of Death Estimation"
        description="Postmortem interval modeling using Henssge's nomogram extended with environmental ML adjustments."
        badge={{ label: 'Forensic Pathology Module', tone: 'cyan' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input form */}
        <div className="lg:col-span-1 space-y-4">
          {fieldGroups.map((group, gi) => {
            const Icon = group.icon;
            return (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: gi * 0.08 }}
                className="panel p-5"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-ink-800">
                  <Icon className="w-4 h-4 text-neon-cyan" />
                  <span className="font-mono text-xs uppercase tracking-wider text-zinc-300">
                    {group.title}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-mono uppercase tracking-wide text-zinc-500 mb-1.5">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={form[field.key]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-200 focus:border-neon-cyan focus:outline-none"
                        >
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          step={field.step}
                          min={field.min}
                          max={field.max}
                          value={form[field.key]}
                          onChange={(e) =>
                            handleChange(field.key, parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-200 focus:border-neon-cyan focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          <button
            onClick={handleEstimate}
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                Computing PMI <LoadingDots />
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" /> Run TOD Estimation
              </span>
            )}
          </button>
        </div>

        {/* Results column */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !loading && (
            <div className="panel p-10 corner-brackets text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-ink-900 border border-ink-700 grid place-items-center mb-4">
                <Clock className="w-7 h-7 text-zinc-500" />
              </div>
              <p className="font-display text-lg text-zinc-300 mb-1">
                Awaiting forensic parameters
              </p>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Enter postmortem readings on the left and run estimation. The model combines
                Henssge's double-exponential cooling equation with corrective factors for
                clothing, humidity, and movement.
              </p>
            </div>
          )}

          {loading && (
            <div className="panel p-10 text-center">
              <div className="loading-dots justify-center mb-4">
                <span /><span /><span />
              </div>
              <p className="font-mono text-sm text-zinc-400">Modeling cooling curve…</p>
            </div>
          )}

          {result && (
            <>
              {/* Hero result */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="panel p-6 corner-brackets"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="section-label mb-1">Estimated PMI</p>
                    <p className="font-display text-4xl text-neon-cyan">
                      {result.pmi_hours_low.toFixed(1)} – {result.pmi_hours_high.toFixed(1)}{' '}
                      <span className="text-xl text-zinc-400">hours</span>
                    </p>
                    <p className="text-sm text-zinc-400 mt-1 font-mono">
                      ≈ {(result.pmi_hours_low / 1).toFixed(1)}h to{' '}
                      {(result.pmi_hours_high / 1).toFixed(1)}h post mortem
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="section-label mb-1">Confidence</p>
                    <p className="font-display text-3xl text-neon-green">
                      {result.confidence}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="bg-ink-900/60 rounded-lg p-3 border border-ink-800">
                    <p className="text-[10px] font-mono uppercase text-zinc-500 mb-1">
                      Method
                    </p>
                    <p className="text-sm font-mono text-zinc-200">{result.method}</p>
                  </div>
                  <div className="bg-ink-900/60 rounded-lg p-3 border border-ink-800">
                    <p className="text-[10px] font-mono uppercase text-zinc-500 mb-1">
                      Cooling coefficient
                    </p>
                    <p className="text-sm font-mono text-zinc-200">
                      k = {result.cooling_coefficient}
                    </p>
                  </div>
                  <div className="bg-ink-900/60 rounded-lg p-3 border border-ink-800">
                    <p className="text-[10px] font-mono uppercase text-zinc-500 mb-1">
                      Correction factor
                    </p>
                    <p className="text-sm font-mono text-zinc-200">
                      ×{result.correction_factor}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Cooling curve chart */}
              <Card title="Body Temperature Cooling Curve" eyebrow="Henssge Model" delay={0.1}>
                <div className="h-72 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.cooling_curve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="hours"
                        stroke="#71717a"
                        fontSize={11}
                        tickFormatter={(v) => `${v}h`}
                        label={{
                          value: 'Hours postmortem',
                          position: 'insideBottom',
                          offset: -4,
                          style: { fill: '#71717a', fontSize: 10 },
                        }}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        domain={[20, 38]}
                        tickFormatter={(v) => `${v}°C`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0a0d14',
                          border: '1px solid #1f2937',
                          borderRadius: 8,
                          fontFamily: 'JetBrains Mono',
                          fontSize: 12,
                        }}
                      />
                      <ReferenceArea
                        x1={result.pmi_hours_low}
                        x2={result.pmi_hours_high}
                        fill="#00e5ff"
                        fillOpacity={0.12}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#00e5ff"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs font-mono text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-neon-cyan rounded" /> Predicted curve
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-neon-cyan/20 border border-neon-cyan/40 rounded" />
                    Probable PMI band
                  </span>
                </div>
              </Card>

              {/* Factor weights */}
              <Card title="Contributing Factors" eyebrow="Model breakdown" delay={0.2}>
                <div className="space-y-3">
                  {result.factors.map((f, i) => (
                    <div key={f.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs text-zinc-300 uppercase tracking-wide">
                          {f.name}
                        </span>
                        <span className="font-mono text-xs text-neon-cyan">
                          {(f.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-ink-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${f.weight * 100}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                          className="h-full bg-gradient-to-r from-neon-cyan to-cyan-300"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 font-mono">{f.note}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Disclaimer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="panel p-4 border-neon-amber/30 bg-neon-amber/[0.03]"
              >
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-neon-amber flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-neon-amber font-display">Medical disclaimer:</strong>{' '}
                    PMI estimates are statistical approximations. Final time-of-death
                    determination must be performed by a qualified forensic pathologist
                    considering autopsy findings, environmental investigation, and corroborating
                    evidence. This output is decision support only.
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
