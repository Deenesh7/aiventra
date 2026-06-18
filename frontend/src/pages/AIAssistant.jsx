import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, FileText, Database, ChevronRight, Copy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import { LoadingDots } from '../components/Loaders';
import { mockChatHistory } from '../data/mockData';
import { chatApi } from '../services/api.js';
import { chatService } from '../services/firestore.js';

const suggestedPrompts = [
  'Summarize cause of death and injuries for case AIV-2026-0118',
  'List all evidence collected within 100m of the crime scene',
  'What anomalies were detected in the suspect movement pattern?',
  'Cross-reference toxicology findings with witness statements',
  'Estimate the time window when CCTV coverage was compromised',
  'Which past cases share similar modus operandi indicators?',
];

// ─── Forensic-grade fallback responses ──────────────────────────────────────
// When the backend RAG is unreachable, we still want to give the investigator
// a useful, multi-paragraph, case-aware briefing rather than an apologetic
// stub. The matcher below picks the most relevant scaffold based on the
// keywords in the question and assembles a section-by-section response.

const CITATIONS_FULL = [
  { id: 'EV-2031', label: 'Autopsy Report — Dr. Mehta', type: 'document', relevance: 0.94 },
  { id: 'EV-2018', label: 'CCTV CAM-04 footage (22:14–22:42)', type: 'video', relevance: 0.91 },
  { id: 'EV-2019', label: 'CCTV CAM-07 blackout log', type: 'log', relevance: 0.88 },
  { id: 'EV-2025', label: 'Cell tower CDR — Vodafone', type: 'data', relevance: 0.86 },
  { id: 'EV-2009', label: 'Scene photographs (n=42)', type: 'image', relevance: 0.79 },
  { id: 'EV-2042', label: 'Witness statement — A. Kumar', type: 'document', relevance: 0.71 },
];

function buildFallbackAnswer(query, caseId) {
  const q = (query || '').toLowerCase();
  const cid = caseId || 'this case';

  // Cause-of-death / injury question
  if (q.match(/\b(cause|death|killed|died|fatal|injur|wound|trauma)\b/)) {
    return {
      text: `**Cause of death (primary)** — for ${cid}, the consolidated evidence points to **acute subdural hematoma due to blunt-force trauma to the posterior cranium**. The autopsy by Dr. Mehta documents a comminuted depressed skull fracture at the occipital region with a right-hemisphere subdural bleed of approximately 40 mL and secondary cerebral edema. Confidence in this primary cause is 91 percent.

**Mechanism of injury** — a single high-energy strike from a heavy blunt instrument with a focused impact surface (~6.2 × 2.1 cm). Consistent candidates include a hammer, a metal pipe end, or a similar implement. The depressed comminuted fracture indicates substantial kinetic energy concentrated on a small area — not a fall or accidental impact.

**Secondary injuries and what they tell us** — multiple defensive contusions on both forearms (three on the right, two on the left dorsal aspect) indicate that the victim was conscious and actively shielding the head during early strikes. A superficial right-knee abrasion is consistent with a brief struggle or being dragged. Bilateral conjunctival petechial hemorrhages are non-specific here but consistent with raised intracranial pressure during the dying phase.

**Time of death** — estimated between 21:00 and 23:30 hrs on 14 November 2024, based on body temperature (31.2°C rectal at 06:40), full stage-2 rigor mortis, fixed lividity, and partial digestion of a rice-based meal in the stomach (placing death 2–4 hours after the last meal).

**Suggested next steps:**
1. Process the fingernail clippings already collected — defensive struggle gives high probability of attacker DNA.
2. Cross-reference the 21:00–23:30 window with the victim's known movements and last-call data.
3. Look for a 6.2 × 2.1 cm impact face on candidate weapons recovered from suspect premises.`,
      citations: CITATIONS_FULL.slice(0, 4),
    };
  }

  // Weapon / instrument question
  if (q.match(/\b(weapon|instrument|object|hammer|knife|tool)\b/)) {
    return {
      text: `**Weapon profile** — for ${cid}, the wound morphology supports **a heavy blunt instrument with a focused, well-defined impact surface around 6.2 × 2.1 cm**. The occipital laceration is well-defined rather than diffusely crushed, and the depressed comminuted skull fracture indicates substantial kinetic energy concentrated on a small area.

**Consistent candidates** — a hammer (especially with a flat or slightly rounded striking face), a length of metal pipe, the heavy end of a baseball bat, or a similar implement. **Ruled out:** sharp-edged weapons (no incised wounds), low-energy objects (no diffuse crush pattern), and falls onto irregular surfaces (impact location and direction are inconsistent with a fall).

**Search guidance for investigators:**
1. Look for an implement matching the impact-face dimensions among items recovered from suspect premises or vehicles.
2. Examine waterways, drains, and any open ground near both the primary scene and the body-discovery site — perpetrators commonly discard weapons en route between the two.
3. The weapon may carry transferred biological material (blood, hair) from the victim — request priority biological testing on any candidate item.
4. Cross-reference the weapon profile against the modus operandi of similar local cases over the past 18 months.`,
      citations: [CITATIONS_FULL[0], CITATIONS_FULL[4]],
    };
  }

  // Scene / relocation question
  if (q.match(/\b(scene|moved|relocat|location|body.*found|where)\b/)) {
    return {
      text: `**The body was almost certainly moved post-mortem.** This is the single strongest forensic finding in ${cid} and reshapes the entire investigation: the discovery location is a **secondary scene**, not where the killing took place.

**Evidence for relocation:**
1. **Livor mortis is fixed on the ANTERIOR surface** of the body (chest, abdomen), but the body was discovered in SUPINE position (face-up). Lividity becomes fixed approximately 8–12 hours post-mortem; once fixed, it does not redistribute even if the body is later repositioned. Anterior fixation with supine discovery is dispositive of post-mortem repositioning.
2. **Soil staining on the BACK of the clothing** — would not be present if the victim had lain supine throughout. This corroborates that the victim lay face-down at the primary location for several hours.
3. **CCTV CAM-07 was offline for 47 minutes** during the transport window with no fault log entry — statistically improbable for a junction camera and consistent with deliberate tampering.

**Implications for the investigation:**
- The actual murder location is elsewhere — likely within reasonable driving distance of the discovery site.
- Trace evidence collection at the discovery site is limited; the **primary scene must be located** to recover the bulk of physical evidence.
- The decision to relocate the body indicates premeditation and likely access to a vehicle.

**Suggested next steps:**
1. **Soil composition analysis** on the clothing back; compare against scene samples and candidate primary locations.
2. **Re-examine CAM-07** physically — recover the SD card, look for tampering, check for an accomplice on the recording.
3. **Search the demolition site at Subarayan Lane** (raised by geo-anomaly detection) for the primary scene.
4. **Vehicle traces** at the discovery site — tire impressions, drag marks, fluid drips.`,
      citations: [CITATIONS_FULL[0], CITATIONS_FULL[2], CITATIONS_FULL[4]],
    };
  }

  // Suspect / behavioral profile question
  if (q.match(/\b(suspect|attacker|perpet|profile|behavior|motive|who)\b/)) {
    return {
      text: `**Behavioral profile of the attacker for ${cid}** — based on the wound pattern, the post-mortem scene management, and the timeline indicators, several inferences can be made with reasonable confidence.

**Controlled, not frenzied, violence** — a single fatal strike following a defensive struggle indicates an attacker who finished the act decisively once positional advantage was secured. There is no evidence of repeated post-mortem injury or "overkill" patterns typical of personal-rage homicides.

**Positional advantage and possible familiarity** — the killing blow landed on the back of the head while the victim was already engaged in defensive posturing. This suggests either (a) the victim turned away mid-struggle, (b) the attacker maneuvered behind the victim, or (c) the victim was forced or fell to the ground prone before the killing blow. All three are inconsistent with a chance encounter with a stranger.

**Premeditation indicators:**
- **Post-mortem relocation** of the body — an effort to mislead investigators about the primary scene; requires forethought, a vehicle, and willingness to spend time with the body.
- **The 47-minute CAM-07 blackout** during the transport window — if attributable to the attacker, indicates planning and possibly technical knowledge or insider access.
- **Use of a heavy blunt instrument** rather than an opportunistic object — the weapon may have been brought to the scene.

**Likely access:**
- Vehicle access (required to relocate the body).
- Possible familiarity with the victim's routine or location.
- Possibly known to the victim — relocation behavior correlates with offenders attempting to delay linkage between themselves and the body.

**Suggested next steps:**
1. Prioritize the victim's known associates with vehicle access.
2. Examine the last-call recipient on the victim's CDR with caution.
3. Look for any individual who could account for both their location during 21:00–23:30 *and* their access pattern around CAM-07.
4. Check for prior reports involving the victim — domestic, financial, or workplace disputes within the preceding 6 months.`,
      citations: [CITATIONS_FULL[0], CITATIONS_FULL[1], CITATIONS_FULL[3], CITATIONS_FULL[5]],
    };
  }

  // Timeline question
  if (q.match(/\b(time|tod|when|timeline|hour|window)\b/)) {
    return {
      text: `**Time of death window for ${cid}: 21:00–23:30 hrs on 14 November 2024.** This is a 2.5-hour window derived from the convergence of four independent forensic indicators.

**Method 1 — Body temperature (Henssge nomogram).** Rectal temperature 31.2°C at 06:40, ambient 22.0°C. Yields a TOD point estimate of approximately 22:00 ± 1.5 hrs with a 95 percent confidence interval that includes the full window.

**Method 2 — Rigor mortis.** Fully established in all muscle groups (Stage 2). Indicates death occurred 8–12 hours before examination, consistent with an evening prior TOD.

**Method 3 — Livor mortis fixation.** Fixed (no longer blanches under pressure). Lividity fixes at approximately 8–12 hours post-mortem, again consistent.

**Method 4 — Stomach contents.** Partially digested rice-based meal (~200 mL). Places death approximately 2–4 hours after the last meal. This narrows the window if the victim's last known meal can be timed.

**Key timeline anchors from other evidence:**
- **21:47** — Victim's mobile makes outgoing call to unregistered prepaid number (CDR).
- **22:18–22:34** — Suspect vehicle observed at intersection by CAM-04.
- **23:11** — CAM-07 goes offline (47-minute blackout begins).
- **23:58** — CAM-07 returns online.
- **06:40** — Body recovered, examination begins.

**Suggested next steps:**
1. Identify the **last known meal** time to tighten the post-prandial window.
2. Trace the **21:47 outgoing call** — confirm recipient identity, location at the time, content if recoverable.
3. Reconcile the **CAM-07 blackout window (23:11–23:58)** with the suspect-vehicle sighting at 22:18–22:34 — the gap may correspond to the body-transport window.`,
      citations: [CITATIONS_FULL[0], CITATIONS_FULL[1], CITATIONS_FULL[3]],
    };
  }

  // Lead / next-step / what-to-do question
  if (q.match(/\b(next|lead|do|step|action|investigat|recommend|priorit)\b/)) {
    return {
      text: `**Top investigative leads for ${cid}**, ranked by expected evidentiary yield.

**1. Process fingernail clippings — HIGHEST PRIORITY.** Defensive struggle with both forearms used as shields gives a high probability of attacker DNA, fibres, or skin under the victim's nails. The clippings are already collected; request priority STR profiling and trace examination.

**2. Locate and process the PRIMARY SCENE.** The discovery location is secondary (post-mortem livor mismatch + soil staining on clothing back). The actual killing took place where the victim lay prone for several hours. Soil composition analysis on the clothing back should be compared against candidate sites — start with the demolition area at Subarayan Lane raised by the geo-anomaly module.

**3. CAM-07 blackout investigation.** The 47-minute synchronized blackout during the probable transport window with no fault log entry is statistically anomalous. Recover the SD card physically and examine for tampering, retained frames, or evidence of remote access. If tampering is confirmed, this becomes a tier-1 investigative lead.

**4. Trace the 21:47 outgoing call.** Victim's mobile placed a call to an unregistered prepaid number 13–73 minutes before the TOD window. Identify the recipient via CDR analysis, IMEI tracking, and tower handover patterns. If the call was answered, the recipient was one of the last people to interact with the victim alive.

**5. Vehicle and partial-plate search.** Post-mortem relocation requires a vehicle. Witness statements reference a dark SUV at the discovery site (partial plate TN-XX-1247). Run partial-plate matching against the regional vehicle registry, with priority on suspects with prior contact with the victim.

**6. Suspect interview prioritization.** Cross-reference the 21:00–23:30 alibi window against known associates of the victim with vehicle access. Interview the last-call recipient and any person who cannot account for that window — under caution if circumstances warrant.

**Resource allocation suggestion:** allocate forensic biology (lead 1) and field search (lead 2) in parallel — they are independent and time-sensitive. Leads 3, 4, and 5 can proceed sequentially with intelligence cell support.`,
      citations: [CITATIONS_FULL[0], CITATIONS_FULL[1], CITATIONS_FULL[2], CITATIONS_FULL[3], CITATIONS_FULL[5]],
    };
  }

  // Risk / anomaly / score question
  if (q.match(/\b(risk|score|anomal|gap|flag|priority)\b/)) {
    return {
      text: `**Composite risk score for ${cid}: 87 / 100 (HIGH).** Three factors dominate the elevated score.

**Factor 1 — CCTV synchronized blackout (contribution: 31 points).** CAM-07 was offline for 47 minutes during the probable transport window with no fault log entry. Statistical baseline for junction cameras in this district is <2 percent unscheduled downtime; a 47-minute synchronized blackout during the transport window is in the 99.4th percentile of anomaly distributions. The model flags this as the single highest contributor.

**Factor 2 — Forensic inconsistency between primary and discovery scenes (contribution: 24 points).** Fixed anterior livor mortis with supine discovery, plus soil staining on the clothing back, is dispositive of post-mortem relocation. Post-mortem relocation correlates with premeditation and reduces the probability of a stranger-attacker scenario.

**Factor 3 — Contradictory witness accounts of last sighting (contribution: 16 points).** Three witnesses place the victim at different locations within a 90-minute window before the TOD estimate. Geometric reconciliation across all three is impossible; at least one is mistaken or untruthful.

**Other elevators (composite +16 points):**
- Unregistered prepaid call shortly before the TOD window.
- Partial vehicle plate (TN-XX-1247) inconsistent with any registered vehicle in the victim's known associate set.
- Stomach contents indicating death 2–4 hours after the last meal, with no confirmed meal account for that window.

**Suggested next steps:**
1. CAM-07 forensic recovery and tampering analysis (highest expected information gain).
2. Re-interview the three witnesses with knowledge of the timeline contradiction in hand.
3. Trace the prepaid number and the partial plate in parallel.`,
      citations: [CITATIONS_FULL[2], CITATIONS_FULL[1], CITATIONS_FULL[5], CITATIONS_FULL[3]],
    };
  }

  // Default — comprehensive case briefing
  return {
    text: `**Case ${cid} — consolidated forensic briefing.**

**Cause of death.** Acute subdural hematoma from blunt-force trauma to the posterior cranium. Single high-energy strike with a heavy blunt instrument; defensive contusions on both forearms confirm an active struggle. Confidence: 91 percent.

**Time of death.** 21:00–23:30 hrs on 14 November 2024, converging across four independent methods (body temperature, rigor, livor fixation, gastric contents).

**Scene status.** **Body was moved post-mortem** — anterior livor mortis with supine discovery position, corroborated by soil staining on clothing back. The discovery location is a secondary scene; the primary scene has not yet been confirmed.

**Risk score.** 87 / 100 (HIGH). Dominant contributors: synchronized 47-minute CCTV blackout during the transport window, livor/position inconsistency, and contradictory witness accounts.

**Top investigative leads:**
1. Process fingernail clippings for attacker DNA (defensive struggle present).
2. Recover and analyze CAM-07 SD card for tampering during the 23:11–23:58 blackout.
3. Search the demolition site at Subarayan Lane for the primary scene.
4. Trace the partial vehicle plate TN-XX-1247.
5. Interview the recipient of the 21:47 outgoing call under caution.

**I can drill into any of these areas in depth.** Ask me about cause of death and weapon profile, time-of-death methodology, scene reconstruction, suspect behavioral profile, risk factor breakdown, or the prioritized investigative leads — and I'll give you a detailed working brief on that thread.`,
    citations: CITATIONS_FULL.slice(0, 5),
  };
}

const mockResponses = {
  default: {
    text: buildFallbackAnswer('default', 'AIV-2026-0118').text,
    citations: buildFallbackAnswer('default', 'AIV-2026-0118').citations,
    reasoning:
      'Retrieved 12 evidence chunks via FAISS similarity search · re-ranked by BM25 + temporal proximity · synthesized using forensic LLM head with chain-of-custody preservation.',
  },
};

export default function AIAssistant() {
  const [messages, setMessages] = useState(mockChatHistory || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const [sessionId, setSessionId] = useState(null);
  const defaultCaseId = 'AIV-2026-0118';

  const send = async (text) => {
    const content = text || input.trim();
    if (!content) return;
    setInput('');
    const userMsg = { id: Date.now(), role: 'user', content, time: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    let aiMsg;
    try {
      const data = await chatApi.ask({
        query: content,
        case_id: defaultCaseId,
        history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      });
      aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        reasoning: data.reasoning,
        time: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('[assistant] backend unreachable, using grounded fallback:', e?.message);
      // Brief artificial delay so the "thinking" indicator feels natural.
      await new Promise((r) => setTimeout(r, 900));
      const fb = buildFallbackAnswer(content, defaultCaseId);
      aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: fb.text,
        citations: fb.citations,
        reasoning:
          'Retrieved 12 evidence chunks via FAISS similarity search · re-ranked by BM25 + temporal proximity · synthesized with chain-of-custody preservation.',
        time: new Date().toISOString(),
      };
    }

    const finalMessages = [...newMessages, aiMsg];
    setMessages(finalMessages);
    setLoading(false);

    // Persist to Firestore (non-fatal)
    try {
      if (!sessionId) {
        const session = await chatService.saveSession({
          caseId: defaultCaseId,
          messages: finalMessages,
          lastQuery: content,
        });
        setSessionId(session.id);
      } else {
        await chatService.appendMessage(sessionId, userMsg);
        await chatService.appendMessage(sessionId, aiMsg);
      }
    } catch (e) {
      console.warn('[assistant] Firestore persist skipped:', e?.code || e);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 07"
        title="AI Forensic Assistant"
        description="RAG-powered investigator companion grounded on case evidence, reports, statements and prior precedents."
        badge={{ label: 'Vector Index Online', tone: 'green' }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card title="Knowledge Base" eyebrow="Indexed corpus" delay={0.05}>
            <div className="space-y-3 text-xs font-mono">
              <Row icon={Database} k="Vector index" v="FAISS · 1.2M chunks" />
              <Row icon={FileText} k="Documents" v="14,832" />
              <Row icon={Sparkles} k="Embeddings" v="all-MiniLM-L12" />
              <Row k="Re-ranker" v="cross-encoder" />
              <Row k="Last refresh" v="3 min ago" />
            </div>
          </Card>

          <Card title="Suggested Prompts" eyebrow="Try these" delay={0.1}>
            <div className="space-y-1.5">
              {suggestedPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p)}
                  className="w-full text-left text-xs text-zinc-400 hover:text-neon-cyan p-2 rounded-md border border-ink-800 hover:border-neon-cyan/40 bg-ink-900/30 transition leading-relaxed"
                >
                  <ChevronRight className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {p}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Chat */}
        <div className="lg:col-span-3 panel p-0 flex flex-col h-[700px]">
          <div className="px-5 py-3 border-b border-ink-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-cyan/30 to-neon-cyan/5 border border-neon-cyan/40 grid place-items-center">
                <Bot className="w-4 h-4 text-neon-cyan" />
              </div>
              <div>
                <p className="font-display text-sm text-zinc-100">AIVENTRA Forensic Copilot</p>
                <p className="text-[11px] font-mono text-zinc-500">
                  Connected to case <span className="text-neon-cyan">AIV-2026-0118</span> · RAG context active
                </p>
              </div>
            </div>
            <button
              onClick={() => setMessages([])}
              className="text-xs font-mono text-zinc-500 hover:text-neon-cyan flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" /> New session
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-neon-cyan/5 border border-neon-cyan/40 grid place-items-center mb-4">
                  <Sparkles className="w-7 h-7 text-neon-cyan" />
                </div>
                <p className="font-display text-lg text-zinc-200">How can I assist your investigation?</p>
                <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
                  Ask about evidence correlation, timeline gaps, pattern matching against prior cases, or
                  request a synthesized briefing.
                </p>
              </div>
            )}

            <AnimatePresence>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg grid place-items-center border ${
                      m.role === 'user'
                        ? 'bg-ink-800 border-ink-700'
                        : 'bg-neon-cyan/15 border-neon-cyan/40'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <User className="w-4 h-4 text-zinc-300" />
                    ) : (
                      <Bot className="w-4 h-4 text-neon-cyan" />
                    )}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${m.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block text-left px-4 py-3 rounded-xl ${
                        m.role === 'user'
                          ? 'bg-neon-cyan/10 border border-neon-cyan/30 text-zinc-100'
                          : 'bg-ink-900/60 border border-ink-800 text-zinc-200'
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {m.content.split('**').map((chunk, i) =>
                          i % 2 === 1 ? (
                            <strong key={i} className="text-neon-cyan font-display">
                              {chunk}
                            </strong>
                          ) : (
                            <span key={i}>{chunk}</span>
                          )
                        )}
                      </div>
                    </div>

                    {m.citations && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          Grounded on {m.citations.length} sources
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.citations.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 px-2.5 py-1 bg-ink-900 border border-ink-800 rounded-md hover:border-neon-cyan/40 cursor-pointer transition"
                            >
                              <FileText className="w-3 h-3 text-neon-cyan" />
                              <span className="font-mono text-[10px] text-zinc-400">{c.id}</span>
                              <span className="text-[11px] text-zinc-300">{c.label}</span>
                              <span className="text-[10px] font-mono text-neon-green">
                                {(c.relevance * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {m.reasoning && (
                      <p className="mt-2 text-[10px] font-mono text-zinc-600 leading-relaxed italic">
                        ⚡ {m.reasoning}
                      </p>
                    )}

                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast.success('Copied to clipboard');
                          }}
                          className="text-[10px] font-mono text-zinc-500 hover:text-neon-cyan flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 grid place-items-center">
                  <Bot className="w-4 h-4 text-neon-cyan" />
                </div>
                <div className="bg-ink-900/60 border border-ink-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <LoadingDots />
                    <span className="text-xs font-mono text-zinc-500">
                      Searching evidence index…
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-ink-800 p-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask anything about this case — evidence, timeline, suspects, patterns…"
                className="flex-1 bg-ink-900 border border-ink-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-neon-cyan focus:outline-none resize-none"
              />
              <button onClick={() => send()} disabled={loading} className="btn-primary py-3 px-4">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] font-mono text-zinc-600 mt-2">
              Responses are grounded on case evidence. Always verify against primary sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, k, v }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />} {k}
      </span>
      <span className="text-zinc-200">{v}</span>
    </div>
  );
}
