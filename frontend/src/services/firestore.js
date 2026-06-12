// Firestore data layer for AIVENTRA
// Collections: users, cases, evidence, geo_markers, timeline_events, chat_sessions
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
  onSnapshot,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

const ts = () => serverTimestamp();

const toIso = (v) => {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v?.toDate) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return v;
};

const normalize = (snap) => {
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    created_at: toIso(data.created_at),
    updated_at: toIso(data.updated_at),
    incident_date: toIso(data.incident_date) || data.incident_date,
  };
};

// ─────────────── Cases ───────────────
export const casesService = {
  async list({ status, q, limit = 100 } = {}) {
    const ref = collection(db, 'cases');
    const clauses = [orderBy('created_at', 'desc'), fsLimit(limit)];
    if (status && status !== 'all') clauses.unshift(where('status', '==', status));
    const snap = await getDocs(query(ref, ...clauses));
    let rows = snap.docs.map(normalize);
    if (q) {
      const ql = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(ql) ||
          (r.location || '').toLowerCase().includes(ql) ||
          (r.case_number || '').toLowerCase().includes(ql),
      );
    }
    return rows;
  },

  async get(id) {
    // try doc id first
    const direct = await getDoc(doc(db, 'cases', id));
    if (direct.exists()) return normalize(direct);
    // fallback: search by case_number
    const snap = await getDocs(query(collection(db, 'cases'), where('case_number', '==', id), fsLimit(1)));
    if (!snap.empty) return normalize(snap.docs[0]);
    return null;
  },

  async create(payload) {
    const ref = collection(db, 'cases');
    const allSnap = await getDocs(ref);
    const count = allSnap.size;
    const yr = new Date().getFullYear();
    const caseNumber = `AIV-${yr}-${String(count + 1).padStart(4, '0')}`;
    const u = auth.currentUser;
    const docPayload = {
      case_number: caseNumber,
      title: payload.title,
      location: payload.location,
      status: 'active',
      priority: payload.priority || 'high',
      case_type: payload.case_type || 'homicide',
      risk_score: 0,
      risk_level: 'low',
      description: payload.description || '',
      incident_date: payload.incident_date || null,
      victim: payload.victim_name
        ? { name: payload.victim_name, age: payload.victim_age, gender: payload.victim_gender }
        : null,
      investigator: u ? { id: u.uid, name: u.displayName || u.email } : null,
      evidence_count: 0,
      created_at: ts(),
      updated_at: ts(),
    };
    const added = await addDoc(ref, docPayload);
    return { id: added.id, ...docPayload, case_number: caseNumber };
  },

  async update(id, patch) {
    await updateDoc(doc(db, 'cases', id), { ...patch, updated_at: ts() });
    const snap = await getDoc(doc(db, 'cases', id));
    return snap.exists() ? normalize(snap) : null;
  },

  async setRisk(id, score, level) {
    await updateDoc(doc(db, 'cases', id), {
      risk_score: score,
      risk_level: level,
      updated_at: ts(),
    });
  },

  async remove(id) {
    await deleteDoc(doc(db, 'cases', id));
    return true;
  },

  subscribe(id, cb) {
    return onSnapshot(doc(db, 'cases', id), (snap) => {
      if (snap.exists()) cb(normalize(snap));
    });
  },
};

// ─────────────── Evidence ───────────────
export const evidenceService = {
  async listForCase(caseId) {
    const snap = await getDocs(
      query(collection(db, 'evidence'), where('case_id', '==', caseId), orderBy('collected_at', 'desc')),
    );
    return snap.docs.map(normalize);
  },

  async create({ caseId, type, name, description, fileUrl, storagePath, metadata }) {
    const u = auth.currentUser;
    const ev = {
      case_id: caseId,
      type,
      name,
      description: description || '',
      collected_by: u?.displayName || u?.email || 'Unknown investigator',
      collected_at: ts(),
      chain_of_custody: [
        {
          actor: u?.displayName || u?.email || 'Investigator',
          action: 'collected',
          timestamp: new Date().toISOString(),
        },
      ],
      file_url: fileUrl || null,
      storage_path: storagePath || null,
      metadata: metadata || {},
    };
    const added = await addDoc(collection(db, 'evidence'), ev);
    // bump count on the case
    try {
      await updateDoc(doc(db, 'cases', caseId), {
        evidence_count: increment(1),
        updated_at: ts(),
      });
    } catch (_) {
      /* case may not exist yet — ignore */
    }
    return { id: added.id, ...ev };
  },

  async remove(id) {
    await deleteDoc(doc(db, 'evidence', id));
    return true;
  },
};

// ─────────────── Geo markers ───────────────
export const geoService = {
  async listForCase(caseId) {
    const snap = await getDocs(query(collection(db, 'geo_markers'), where('case_id', '==', caseId)));
    return snap.docs.map(normalize);
  },

  async add(caseId, marker) {
    const added = await addDoc(collection(db, 'geo_markers'), {
      ...marker,
      case_id: caseId,
      created_at: ts(),
    });
    return { id: added.id, case_id: caseId, ...marker };
  },

  async update(id, patch) {
    await updateDoc(doc(db, 'geo_markers', id), { ...patch, updated_at: ts() });
    return true;
  },

  async remove(id) {
    await deleteDoc(doc(db, 'geo_markers', id));
    return true;
  },

  /**
   * Set the primary body-location marker for a case.
   * If one exists (type=crime_scene), update it; otherwise create.
   */
  async upsertBodyLocation(caseId, { lat, lng, label, note, address }) {
    const existing = await getDocs(
      query(
        collection(db, 'geo_markers'),
        where('case_id', '==', caseId),
        where('type', '==', 'crime_scene'),
        fsLimit(1),
      ),
    );
    if (!existing.empty) {
      const ref = existing.docs[0].ref;
      await updateDoc(ref, { lat, lng, label, note, address, updated_at: ts() });
      return { id: existing.docs[0].id, case_id: caseId, type: 'crime_scene', lat, lng, label, note, address };
    }
    return await this.add(caseId, {
      type: 'crime_scene',
      lat,
      lng,
      label: label || 'Body location',
      note: note || '',
      address: address || '',
    });
  },
};

// ─────────────── Timeline ───────────────
export const timelineService = {
  async listForCase(caseId) {
    const snap = await getDocs(
      query(collection(db, 'timeline_events'), where('case_id', '==', caseId), orderBy('time', 'asc')),
    );
    return snap.docs.map(normalize);
  },

  async add(caseId, event) {
    const added = await addDoc(collection(db, 'timeline_events'), {
      ...event,
      case_id: caseId,
      created_at: ts(),
    });
    return { id: added.id, case_id: caseId, ...event };
  },
};

// ─────────────── Dashboard aggregates ───────────────
export const dashboardService = {
  async overview() {
    const snap = await getDocs(collection(db, 'cases'));
    const rows = snap.docs.map(normalize);
    const stats = {
      total_cases: rows.length,
      active_cases: rows.filter((r) => r.status === 'active').length,
      pending_review: rows.filter((r) => r.status === 'pending_review').length,
      closed_cases: rows.filter((r) => r.status === 'closed').length,
      high_risk: rows.filter((r) => Number(r.risk_score || 0) >= 60 && Number(r.risk_score || 0) < 80).length,
      critical: rows.filter((r) => Number(r.risk_score || 0) >= 80).length,
      evidence_processed_24h: 0,
      ai_inferences_24h: 0,
    };
    // weekly synthetic for first 7 days
    const today = new Date();
    const seed = (s) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return Math.abs(h);
    };
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const k = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`;
      const s = seed(k);
      return {
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
        cases: 4 + (s % 9),
        alerts: 2 + (s % 5),
        resolved: 1 + (s % 6),
      };
    });
    const throughput = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      const k = `${d.getFullYear()}${d.getMonth()}${d.getDate()}tp`;
      const s = seed(k);
      return {
        date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
        ingested: 10 + (s % 22),
        processed: 8 + (s % 18),
      };
    });
    const recent_alerts = [
      { id: 'A-7741', level: 'critical', title: 'CCTV gap detected — top case', time: '12 min ago' },
      { id: 'A-7740', level: 'high', title: 'Contradicting witness statements', time: '47 min ago' },
      { id: 'A-7738', level: 'medium', title: 'Toxicology results uploaded', time: '2 h ago' },
      { id: 'A-7735', level: 'low', title: 'Chain of custody verified', time: '5 h ago' },
    ];
    const priority_cases = [...rows]
      .sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0))
      .slice(0, 4);
    return { stats, weekly_activity: weekly, throughput_30d: throughput, recent_alerts, priority_cases };
  },
};

// ─────────────── Analyses (autopsy NLP, TOD, risk, image CV) ───────────────
// Persists every AI inference so dashboards and explainability panels can
// look it up later instead of re-running expensive models.
export const analysisService = {
  /**
   * Save an analysis result.
   * type ∈ {autopsy, tod, risk, image, timeline, assistant_session}
   */
  async save({ caseId, type, payload, summary, provider, model }) {
    const u = auth.currentUser;
    const doc = {
      case_id: caseId,
      type,
      payload,
      summary: summary || null,
      provider: provider || null,
      model: model || null,
      created_by: u ? { id: u.uid, name: u.displayName || u.email } : null,
      created_at: ts(),
    };
    const added = await addDoc(collection(db, 'analyses'), doc);
    return { id: added.id, ...doc };
  },

  async listForCase(caseId, type = null) {
    const clauses = [where('case_id', '==', caseId)];
    if (type) clauses.push(where('type', '==', type));
    clauses.push(orderBy('created_at', 'desc'));
    const snap = await getDocs(query(collection(db, 'analyses'), ...clauses));
    return snap.docs.map(normalize);
  },

  async latestForCase(caseId, type) {
    const items = await this.listForCase(caseId, type);
    return items[0] || null;
  },
};

// ─────────────── Chat sessions (AI Assistant transcripts) ───────────────
export const chatService = {
  async saveSession({ caseId, messages, lastQuery }) {
    const u = auth.currentUser;
    const doc = {
      case_id: caseId || null,
      messages,
      last_query: lastQuery || null,
      owner: u?.uid || null,
      updated_at: ts(),
    };
    const added = await addDoc(collection(db, 'chat_sessions'), doc);
    return { id: added.id, ...doc };
  },

  async appendMessage(sessionId, message) {
    const ref = doc(db, 'chat_sessions', sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const current = snap.data().messages || [];
    await updateDoc(ref, { messages: [...current, message], updated_at: ts() });
    return { id: sessionId, messages: [...current, message] };
  },
};
export const demoSeed = {
  async ensureSeeded() {
    const snap = await getDocs(collection(db, 'cases'));
    if (snap.size > 0) return;
    const u = auth.currentUser;
    const demo = [
      {
        case_number: 'AIV-2026-0118',
        title: 'Riverside residence — unattended death',
        location: 'Mylapore, Chennai, TN',
        status: 'active',
        priority: 'critical',
        case_type: 'homicide',
        risk_score: 87,
        risk_level: 'critical',
        description:
          'Female victim discovered at residence with signs of asphyxia. Suspect vehicle on local CCTV.',
        victim: { name: 'REDACTED', age: 34, gender: 'female' },
        incident_date: '2026-05-22T22:30:00Z',
        evidence_count: 12,
      },
      {
        case_number: 'AIV-2026-0117',
        title: 'Parking lot stabbing',
        location: 'Bandra West, Mumbai, MH',
        status: 'active',
        priority: 'high',
        case_type: 'homicide',
        risk_score: 73,
        risk_level: 'high',
        description: 'Male victim with multiple sharp-force injuries.',
        victim: { name: 'REDACTED', age: 41, gender: 'male' },
        incident_date: '2026-05-19T03:15:00Z',
        evidence_count: 9,
      },
      {
        case_number: 'AIV-2026-0115',
        title: 'Overpass body recovery',
        location: 'Koramangala, Bengaluru, KA',
        status: 'pending_review',
        priority: 'high',
        case_type: 'suspicious_death',
        risk_score: 62,
        risk_level: 'medium',
        description: 'Unidentified body recovered beneath overpass.',
        victim: { name: 'Unidentified', age: null, gender: 'male' },
        incident_date: '2026-05-16T05:42:00Z',
        evidence_count: 7,
      },
      {
        case_number: 'AIV-2026-0112',
        title: 'Disputed vehicular fatality',
        location: 'Hauz Khas, New Delhi, DL',
        status: 'active',
        priority: 'medium',
        case_type: 'vehicular',
        risk_score: 48,
        risk_level: 'medium',
        description: 'Contested whether death was result of impact or pre-existing condition.',
        victim: { name: 'REDACTED', age: 58, gender: 'male' },
        incident_date: '2026-05-10T18:20:00Z',
        evidence_count: 5,
      },
      {
        case_number: 'AIV-2026-0109',
        title: 'Workplace toxin exposure',
        location: 'Hinjewadi, Pune, MH',
        status: 'closed',
        priority: 'low',
        case_type: 'industrial',
        risk_score: 22,
        risk_level: 'low',
        description: 'Closed — ruled accidental industrial exposure.',
        victim: { name: 'REDACTED', age: 47, gender: 'male' },
        incident_date: '2026-04-28T11:10:00Z',
        evidence_count: 4,
      },
      {
        case_number: 'AIV-2026-0103',
        title: 'Domestic incident — Sector 21',
        location: 'Sector 21, Noida, UP',
        status: 'active',
        priority: 'high',
        case_type: 'homicide',
        risk_score: 81,
        risk_level: 'critical',
        description: 'Suspicious domestic incident with conflicting witness statements.',
        victim: { name: 'REDACTED', age: 29, gender: 'female' },
        incident_date: '2026-04-22T01:50:00Z',
        evidence_count: 11,
      },
    ];
    for (const d of demo) {
      await addDoc(collection(db, 'cases'), {
        ...d,
        investigator: u ? { id: u.uid, name: u.displayName || u.email } : { name: 'Det. K. Iyer' },
        created_at: ts(),
        updated_at: ts(),
      });
    }
  },
};
