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

const mockResponses = {
  default: {
    text: `Based on the consolidated forensic intelligence for case AIV-2026-0118, here is what the evidence currently supports:

**Cause of death (primary):** Asphyxia by manual strangulation, supported by hyoid bone fracture and petechial hemorrhages noted in the autopsy report.

**Secondary injuries:** Blunt-force trauma to the right parietal region — likely peri-mortem based on inflammatory response analysis.

**Timeline alignment:** CCTV footage from junction CAM-04 places the suspect at the scene between 22:18 and 22:34. Mobile tower ping data from the victim's device corroborates this window with a final signal at 22:31:42.

**Risk indicators:** The model flagged a 27-minute CCTV gap on the eastern access route that statistically deviates from baseline coverage for this district.`,
    citations: [
      { id: 'EV-2031', label: 'Autopsy Report — Dr. Mehra', type: 'document', relevance: 0.94 },
      { id: 'EV-2018', label: 'CCTV CAM-04 footage', type: 'video', relevance: 0.88 },
      { id: 'EV-2025', label: 'Cell tower CDR — Vodafone', type: 'data', relevance: 0.86 },
      { id: 'EV-2009', label: 'Scene photographs (n=42)', type: 'image', relevance: 0.71 },
    ],
    reasoning: 'Retrieved 12 evidence chunks via FAISS similarity search · re-ranked by BM25 + temporal proximity · synthesized using forensic LLM head with chain-of-custody preservation.',
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
      console.warn('[assistant] backend unreachable, using mock:', e?.message);
      await new Promise((r) => setTimeout(r, 1000));
      aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: mockResponses.default.text,
        citations: mockResponses.default.citations,
        reasoning: mockResponses.default.reasoning + ' (mock — AI backend offline)',
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
