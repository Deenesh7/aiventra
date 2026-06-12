# NLP & LLM Setup for AIVENTRA

AIVENTRA's forensic reasoning is powered by a **hybrid LLM router** that
picks the best available provider at request time:

```
┌─────────────────────────────────────────────────────────────┐
│  Request                                                     │
│     │                                                        │
│     ▼                                                        │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────┐  │
│  │ Gemini Flash │───▶│ Ollama TinyLlama │───▶│ Templated │  │
│  │  (cloud)     │    │   (local)        │    │ fallback  │  │
│  └──────────────┘    └──────────────────┘    └───────────┘  │
│        free                local                 always-on   │
│       15 RPM             unlimited                no-op      │
└─────────────────────────────────────────────────────────────┘
```

Each provider is automatically used if available, and the system falls
through to the next one on failure. You can run AIVENTRA with **any
subset** — no providers, just Gemini, just Ollama, or both.

---

## Recommended: Gemini 1.5 Flash (cloud, free)

**Best forensic reasoning quality, 15 requests/minute, 1500/day, no card required.**

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with any Google account
3. Click **Create API key** → **Create API key in new project**
4. Copy the key
5. Paste it into `backend/.env`:
   ```env
   GEMINI_API_KEY=AIza...your-key-here...
   ```
6. Restart the backend. Look for:
   ```
   [llm] Gemini ready (model=gemini-1.5-flash)
   ```

That's it. Every autopsy analysis, RAG assistant query, and structured
extraction now runs through Gemini Flash. The free tier is generous enough
to cover full evaluation and small-team production use.

---

## Optional: Local Ollama TinyLlama (offline fallback)

When the network is down, or you've hit Gemini's rate limit, the router
falls through to a local Ollama instance.

### Install Ollama

- **Windows / Mac**: download installer from https://ollama.com/download
- **Linux**: `curl -fsSL https://ollama.com/install.sh | sh`

### Pull TinyLlama

```bash
ollama pull tinyllama
ollama serve         # runs at http://localhost:11434
```

TinyLlama is 1.1 B parameters (~640 MB). It's fast but produces noticeably
shallower forensic reasoning than Gemini Flash — use it as an offline
backup, not a primary.

### Want better local quality?

Pull any larger Ollama model and point AIVENTRA at it via `OLLAMA_MODEL`
in `backend/.env`:

| Model | Size | Quality | Speed |
|---|---|---|---|
| `tinyllama` | 640 MB | basic | fast |
| `llama3.2:3b` | 2 GB | good | fast |
| `mistral:7b` | 4 GB | very good | medium |
| `llama3.1:8b` | 4.7 GB | very good | medium |
| `gemma2:9b` | 5.4 GB | excellent | slower |

```env
OLLAMA_MODEL=llama3.2:3b
```

---

## Verifying which provider is active

After starting the backend, check the active provider:

```bash
curl http://localhost:8000/api/health
```

You should see:
```json
{
  "status": "ok",
  "llm": {
    "gemini": true,
    "ollama": false,
    "active": "gemini"
  }
}
```

Or check it from the AIVENTRA dashboard — the Autopsy Analyzer card now
shows which provider answered each request with the inference time.

---

## What the LLM does in AIVENTRA

1. **Autopsy Analyzer** (deep reasoning)
   - Structured JSON extraction: cause of death, injuries, toxicology, suspicious indicators
   - 9-section forensic narrative: attack scenario, victim position, injury sequence, weapon characteristics, signs of struggle, inconsistencies, investigative leads

2. **AI Assistant** (RAG)
   - Retrieves evidence chunks via keyword/vector search
   - Synthesizes grounded answers with citations

3. **Risk Scorer** uses rules + LLM for anomaly narration
4. **Image Analyzer** — currently uses OpenCV only (no LLM), but the body-location detection feeds into the autopsy reasoning chain when both run on the same case.

All LLM outputs are persisted to Firestore `analyses` collection with the
provider name and model version stamped on each record, so the
Explainability panel can audit every prediction.
