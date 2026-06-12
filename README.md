# AIVENTRA

**AI-Powered Forensic Triage & Postmortem Intelligence System**
_Transforming Forensic Intelligence with AI._

AIVENTRA is a full-stack forensic intelligence platform that unifies autopsy
NLP, time-of-death modeling, evidence correlation, geospatial intelligence,
explainable risk scoring, computer-vision scene analysis, and a RAG-grounded
investigator assistant into a single operations console.

---

## Architecture

```
┌──────────────────────────────────────────┐    ┌──────────────────────────┐
│  Frontend  (React + Vite + Tailwind)     │    │  FastAPI AI microservice │
│                                          │    │                          │
│  • Login / Register      ◀──────────┐    │    │  /reports/analyze        │
│  • Cases, Evidence, Geo  ◀────┐     │    │    │  /tod/estimate           │
│  • Dashboard             ◀──┐ │     │    │    │  /risk/score/{case_id}   │
│  • Autopsy / Image / Chat   │ │     │    │◀───┤  /timeline/{case_id}     │
│                             │ │     │    │AI  │  /assistant/ask          │
└──────┬─────────┬────────────┘ │     │    │    │  /images/analyze         │
       │         │              │     │    │    │                          │
   data│    files│              │     │    │    └──────────────┬───────────┘
       ▼         ▼              ▼     ▼    │                   │
┌──────────────┐ ┌─────────────────────────┐    verifies       │
│  Firebase    │ │  Cloudinary             │    Firebase ID ◀──┘
│  (free Spark)│ │  (free 25 GB)           │    tokens
│              │ │                         │
│ • Auth       │ │ • PDF / image / video   │
│ • Firestore  │ │   uploads               │
│ • Analytics  │ │ • CDN delivery          │
└──────────────┘ └─────────────────────────┘
```

- **Frontend** talks to Firebase directly for auth + data, and to Cloudinary
  directly for file uploads (unsigned preset, no backend signing needed).
- **FastAPI** is a focused AI inference microservice. It verifies the
  Firebase ID token on every request, then runs autopsy NLP, TOD modeling,
  risk scoring, timeline reconstruction, RAG retrieval, and OpenCV analysis.
- **Free-tier friendly**: Firebase Storage costs money (Blaze plan), so we
  use Cloudinary's free tier instead — same UX, no payment method required.

This separation makes scaling clean: the data plane runs on Firebase, file
storage on Cloudinary's CDN, and AI workloads can scale horizontally behind
a load balancer.

---

## Module surface

| Module | Capability |
|---|---|
| Autopsy Analyzer | PDF/OCR → NLP for cause-of-death, injuries, toxicology, suspicious indicators |
| TOD Estimation | Henssge cooling model + rigor/livor + ML correction → PMI range |
| Timeline & Evidence | Multi-source event fusion (CCTV, GPS, telephony, social) with anomaly detection |
| Crime Scene Map | Geospatial intel — markers, suspect trajectory, CCTV gaps, playback |
| Risk & Anomalies | 0-100 explainable risk index with SHAP-style factor attribution |
| Forensic Dashboard | Active cases, alerts, throughput, priority queue |
| AI Assistant | RAG over case evidence with citation trails |
| Image Analysis | OpenCV detections, tampering scan, blood-pattern analysis |
| Case Management | Full case CRUD with chain-of-custody preservation |
| Explainability | Per-prediction reasoning trace, evidence provenance, audit log |

---

## Project layout

```
aiventra/
├── frontend/                      React + Vite + Tailwind + Framer Motion
│   ├── src/
│   │   ├── firebase.js            Firebase initialization (Auth + Firestore + Analytics)
│   │   ├── context/               Auth context (Firebase)
│   │   ├── services/
│   │   │   ├── api.js             AI-only API client (FastAPI)
│   │   │   ├── firestore.js       Firestore data layer
│   │   │   └── cloudinary.js      Cloudinary upload service (replaces Firebase Storage)
│   │   ├── components/
│   │   ├── pages/                 10 module pages + landing + auth
│   │   └── data/
│   └── package.json
├── backend/                       FastAPI AI inference microservice
│   ├── app/
│   │   ├── api/                   6 AI routers
│   │   ├── ai_modules/            NLP / TOD / risk / RAG / CV
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── firebase_auth.py   Firebase ID token verification
│   │   │   └── security.py
│   │   └── schemas/
│   └── requirements.txt
├── firestore.rules                Firestore security rules
├── FIREBASE_SETUP.md              Firebase Auth + Firestore walkthrough
└── CLOUDINARY_SETUP.md            Cloudinary upload setup (free tier)
```

---

## Quickstart (5-minute local run)

### 1. Firebase project setup
Follow [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md) — enable Auth (Email/Password)
and create a Firestore database, then publish `firestore.rules`. The project
ID `trace-8e47e` is already wired into the frontend config so no code changes
are needed for the included project.

### 2. Cloudinary setup (for evidence file uploads)
Follow [`CLOUDINARY_SETUP.md`](./CLOUDINARY_SETUP.md) — sign up free (no card
required, 25 GB), create one unsigned upload preset, and paste two values
into `frontend/.env`. Takes 3 minutes.

### 3. Backend (AI service)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The backend starts at **http://localhost:8000**.
Interactive API docs at **http://localhost:8000/docs**.

The backend verifies Firebase ID tokens directly against Google's public
keys, so **no service account file is required** for local development.

**For full forensic reasoning quality**, set `GEMINI_API_KEY` in
`backend/.env` — get a free key at https://aistudio.google.com/app/apikey
(15 RPM, 1500/day, no card required). See [`NLP_SETUP.md`](./NLP_SETUP.md)
for the full LLM provider configuration including local Ollama fallback.

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env                 # optional, defaults work
npm run dev
```

Open **http://localhost:5173**, register any email + 6+ character password,
and you're in. Six demo cases auto-seed into Firestore on first login.

---

## Heavy AI dependencies (optional)

`requirements.txt` keeps OCR, transformers, FAISS, and OpenCV commented out
by default. Uncomment the sections you need and toggle the corresponding
flags in `.env`:

```env
ENABLE_OCR=True
ENABLE_TRANSFORMERS=True
ENABLE_VECTOR_INDEX=True
```

All AI modules **degrade gracefully** if these packages are absent — they
return deterministic high-quality fallback outputs so every screen in the
frontend remains populated. This makes AIVENTRA easy to evaluate in
constrained environments.

---

## Deployment

| Layer | Recommended host |
|---|---|
| Frontend | Firebase Hosting / Vercel / Netlify (static build of `npm run build`) |
| Backend (AI) | Cloud Run / Render / Railway / Fly.io |
| Auth / DB / Storage / Analytics | Firebase (already configured) |

For Cloud Run:
```bash
gcloud run deploy aiventra-ai \
  --source backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=trace-8e47e
```

For Firebase Hosting:
```bash
cd frontend && npm run build
firebase deploy --only hosting
```

---

## Security & ethics

AIVENTRA is **decision-support software** for trained forensic investigators.
All AI outputs include confidence scores and per-prediction reasoning traces
exposed via the Explainability panel. Final determinations — especially
cause of death and time of death — must be made by qualified pathologists
and corroborated by primary investigative evidence.

Chain of custody is preserved on every evidence record and enforced as
append-only in `firestore.rules`. Every model prediction is reproducible
from the persisted feature vector and model version, suitable for inclusion
in court-submitted decision-support reports.

---

## License

This project is provided for educational and research use. Production
deployment in active criminal investigations requires legal review and
appropriate certification of the AI subsystems for your jurisdiction.
