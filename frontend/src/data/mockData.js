// Sample forensic data — used as fallback when backend is unavailable
// All names, locations, and identifiers are fictional.

export const mockCases = [
  {
    id: 'AIV-2026-0118',
    title: 'Riverside Residence — Decedent Investigation',
    status: 'active',
    priority: 'critical',
    risk_score: 87,
    threat_level: 'critical',
    victim: { name: 'John Doe', age: 42, gender: 'M' },
    location: { lat: 13.0827, lng: 80.2707, address: 'Anna Salai, Chennai, TN' },
    created_at: '2026-05-12T08:14:00Z',
    last_updated: '2026-05-23T19:42:00Z',
    evidence_count: 23,
    summary:
      'Decedent discovered at residence with signs of blunt force trauma. Digital evidence suggests presence of two unidentified individuals at the scene during estimated TOD window.',
    investigator: 'Det. A. Krishnan',
  },
  {
    id: 'AIV-2026-0117',
    title: 'Highway Vehicular Incident — Suspicious Indicators',
    status: 'active',
    priority: 'high',
    risk_score: 71,
    threat_level: 'high',
    victim: { name: 'Jane Smith', age: 34, gender: 'F' },
    location: { lat: 12.9716, lng: 77.5946, address: 'NH-44, Bengaluru Outskirts' },
    created_at: '2026-05-08T11:20:00Z',
    last_updated: '2026-05-22T14:11:00Z',
    evidence_count: 17,
    summary:
      'Initial classification as RTA, but vehicle telemetry shows manual brake disengagement 12s prior to impact. Toxicology pending.',
    investigator: 'Det. R. Iyengar',
  },
  {
    id: 'AIV-2026-0112',
    title: 'Warehouse District — Multiple Decedents',
    status: 'active',
    priority: 'critical',
    risk_score: 94,
    threat_level: 'critical',
    victim: { name: 'Multiple (3)', age: '—', gender: '—' },
    location: { lat: 19.076, lng: 72.8777, address: 'Sewri Industrial Zone, Mumbai' },
    created_at: '2026-04-29T03:45:00Z',
    last_updated: '2026-05-23T22:08:00Z',
    evidence_count: 47,
    summary:
      'Three decedents recovered. Pattern-match against AIV-2025-0891 (cold case) returned 78% similarity in scene staging. Cross-case investigation flagged.',
    investigator: 'Sr. Det. M. Pillai',
  },
  {
    id: 'AIV-2026-0109',
    title: 'Apartment Complex — Suspected Poisoning',
    status: 'pending_review',
    priority: 'medium',
    risk_score: 52,
    threat_level: 'medium',
    victim: { name: 'Ravi K.', age: 58, gender: 'M' },
    location: { lat: 17.385, lng: 78.4867, address: 'Banjara Hills, Hyderabad' },
    created_at: '2026-04-21T16:30:00Z',
    last_updated: '2026-05-19T09:55:00Z',
    evidence_count: 11,
    summary: 'Awaiting toxicology panel. AI flagged inconsistency between witness timeline and CCTV footage.',
    investigator: 'Det. S. Reddy',
  },
  {
    id: 'AIV-2026-0098',
    title: 'Coastal Recovery — Identification Pending',
    status: 'active',
    priority: 'high',
    risk_score: 66,
    threat_level: 'high',
    victim: { name: 'Unidentified', age: '~30', gender: 'M' },
    location: { lat: 8.5241, lng: 76.9366, address: 'Shanghumukham Beach, Trivandrum' },
    created_at: '2026-04-02T07:10:00Z',
    last_updated: '2026-05-18T11:23:00Z',
    evidence_count: 9,
    summary: 'Body recovered from coastal area. Decomposition indicators suggest PMI 48–72 hours. Dental records under cross-reference.',
    investigator: 'Det. N. Menon',
  },
  {
    id: 'AIV-2026-0091',
    title: 'Office Tower — Fall Investigation',
    status: 'closed',
    priority: 'low',
    risk_score: 18,
    threat_level: 'low',
    victim: { name: 'Pradeep S.', age: 47, gender: 'M' },
    location: { lat: 28.6139, lng: 77.209, address: 'Connaught Place, New Delhi' },
    created_at: '2026-03-15T13:00:00Z',
    last_updated: '2026-04-30T17:15:00Z',
    evidence_count: 14,
    summary: 'Ruled accidental after correlation of building access logs, witness statements, and forensic analysis.',
    investigator: 'Det. V. Sharma',
  },
];

export const mockTimelineEvents = [
  { id: 1, time: '2026-05-12T18:32:00Z', type: 'cctv', label: 'Subject A enters building (CCTV-04)', confidence: 0.94, location: { lat: 13.0827, lng: 80.2707 } },
  { id: 2, time: '2026-05-12T19:05:00Z', type: 'phone', label: 'Outgoing call from victim phone (88s)', confidence: 0.99 },
  { id: 3, time: '2026-05-12T19:48:00Z', type: 'cctv', label: 'Unknown individual approaches residence', confidence: 0.81, location: { lat: 13.0834, lng: 80.2712 } },
  { id: 4, time: '2026-05-12T20:14:00Z', type: 'gps', label: 'Suspect device pings within 50m radius', confidence: 0.87 },
  { id: 5, time: '2026-05-12T20:41:00Z', type: 'anomaly', label: 'GAP DETECTED — no signals for 27 min', confidence: 0.92, anomaly: true },
  { id: 6, time: '2026-05-12T21:08:00Z', type: 'cctv', label: 'Two individuals exit rear entrance', confidence: 0.78, location: { lat: 13.0825, lng: 80.2701 } },
  { id: 7, time: '2026-05-12T21:35:00Z', type: 'phone', label: 'Victim phone powered off', confidence: 0.99 },
  { id: 8, time: '2026-05-13T07:22:00Z', type: 'discovery', label: 'Body discovered by housekeeper', confidence: 1.0 },
];

export const mockEvidence = [
  { id: 'EVD-001', type: 'document', name: 'autopsy_report_AIV-0118.pdf', uploaded_at: '2026-05-13T11:24:00Z', size: '2.4 MB', priority: 'high', tags: ['autopsy', 'toxicology'] },
  { id: 'EVD-002', type: 'image', name: 'scene_photo_001.jpg', uploaded_at: '2026-05-13T08:11:00Z', size: '4.1 MB', priority: 'critical', tags: ['scene', 'photograph'] },
  { id: 'EVD-003', type: 'image', name: 'scene_photo_002.jpg', uploaded_at: '2026-05-13T08:13:00Z', size: '3.8 MB', priority: 'critical', tags: ['scene', 'photograph'] },
  { id: 'EVD-004', type: 'video', name: 'cctv_entrance_2026-05-12.mp4', uploaded_at: '2026-05-13T14:50:00Z', size: '128 MB', priority: 'critical', tags: ['cctv', 'video'] },
  { id: 'EVD-005', type: 'log', name: 'mobile_metadata_export.csv', uploaded_at: '2026-05-14T10:02:00Z', size: '512 KB', priority: 'high', tags: ['digital', 'metadata'] },
  { id: 'EVD-006', type: 'log', name: 'gps_track_subject_a.json', uploaded_at: '2026-05-14T10:08:00Z', size: '88 KB', priority: 'medium', tags: ['gps', 'digital'] },
  { id: 'EVD-007', type: 'document', name: 'toxicology_panel_v2.pdf', uploaded_at: '2026-05-16T09:30:00Z', size: '780 KB', priority: 'high', tags: ['toxicology', 'lab'] },
];

export const mockReportSummary = {
  case_id: 'AIV-2026-0118',
  cause_of_death: 'Blunt force trauma to the parietal region; secondary asphyxiation indicators present.',
  manner: 'Homicide (provisional)',
  injury_patterns: [
    'Contusion 8cm × 3cm, right parietal',
    'Petechial hemorrhage in conjunctiva — consistent with strangulation',
    'Defensive abrasions on left forearm',
    'Subdural hematoma, occipital region',
  ],
  toxicology: [
    'Ethanol: 0.04% BAC (below intoxication threshold)',
    'Benzodiazepines: trace amounts detected — INVESTIGATE',
    'No other controlled substances detected',
  ],
  medical_observations: [
    'Body temperature at discovery: 28.4°C (ambient 24°C)',
    'Rigor mortis: fully established',
    'Livor mortis: fixed, posterior distribution',
    'Stomach contents: partially digested meal, ~3-4hr post-ingestion',
  ],
  suspicious_indicators: [
    { severity: 'high', text: 'Benzodiazepine trace inconsistent with no-prescription medical history' },
    { severity: 'high', text: 'Defensive wounds suggest struggle prior to incapacitation' },
    { severity: 'medium', text: 'Time-of-death window overlaps with 27-minute CCTV/signal gap' },
  ],
  confidence: 0.89,
  generated_at: '2026-05-13T13:42:00Z',
};

export const mockTODEstimate = {
  pmi_hours_min: 10.5,
  pmi_hours_max: 13.0,
  estimated_tod: '2026-05-12T20:50:00Z',
  confidence: 0.84,
  factors: [
    { name: 'Body Temperature', value: '28.4°C', weight: 0.32 },
    { name: 'Ambient Temperature', value: '24°C', weight: 0.18 },
    { name: 'Rigor Mortis Stage', value: 'Full', weight: 0.22 },
    { name: 'Livor Mortis', value: 'Fixed', weight: 0.15 },
    { name: 'Humidity', value: '68%', weight: 0.08 },
    { name: 'Stomach Contents', value: '3-4hr digested', weight: 0.05 },
  ],
  cooling_curve: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    temp: 37 - (37 - 24) * (1 - Math.exp(-0.075 * i)),
  })),
  disclaimer: 'Estimation generated by AI inference model. NOT a substitute for forensic pathologist determination.',
};

export const mockRiskAnalysis = {
  case_id: 'AIV-2026-0118',
  risk_score: 87,
  threat_level: 'critical',
  factors: [
    { id: 'F1', label: 'Timeline gap (27 min) overlaps TOD window', weight: 22, severity: 'critical' },
    { id: 'F2', label: 'Defensive wounds present', weight: 18, severity: 'high' },
    { id: 'F3', label: 'Unexplained controlled substance in toxicology', weight: 16, severity: 'high' },
    { id: 'F4', label: 'Multiple unidentified individuals on CCTV', weight: 14, severity: 'high' },
    { id: 'F5', label: 'Device signal anomaly at scene', weight: 9, severity: 'medium' },
    { id: 'F6', label: 'Witness statement contradicts CCTV (8m delta)', weight: 8, severity: 'medium' },
  ],
  explanation:
    'The AI identified multiple high-severity correlated indicators across physical, digital, and behavioral evidence streams. The convergence of a TOD-overlapping timeline gap, defensive injuries, and unexplained pharmacology produces a critical risk classification.',
};

export const mockGeoMarkers = [
  { id: 'M1', lat: 13.0827, lng: 80.2707, type: 'crime_scene', label: 'Primary Scene', severity: 'critical' },
  { id: 'M2', lat: 13.0834, lng: 80.2712, type: 'evidence', label: 'Witness Location', severity: 'medium' },
  { id: 'M3', lat: 13.0821, lng: 80.27, type: 'cctv', label: 'CCTV-04 (operational)', severity: 'info' },
  { id: 'M4', lat: 13.0832, lng: 80.2722, type: 'cctv', label: 'CCTV-07 (operational)', severity: 'info' },
  { id: 'M5', lat: 13.0815, lng: 80.2715, type: 'cctv', label: 'CCTV-12 (OFFLINE)', severity: 'high' },
  { id: 'M6', lat: 13.0838, lng: 80.2695, type: 'suspect', label: 'Subject A — Signal Ping', severity: 'high' },
  { id: 'M7', lat: 13.0825, lng: 80.27, type: 'evidence', label: 'Rear Exit (Used)', severity: 'high' },
];

export const mockSuspectPath = [
  [13.0805, 80.2685],
  [13.0815, 80.269],
  [13.0825, 80.2695],
  [13.0832, 80.2705],
  [13.0834, 80.2712],
  [13.0827, 80.2707], // crime scene
  [13.0825, 80.27],
  [13.0815, 80.2685],
  [13.08, 80.267],
];

export const mockDashboardStats = {
  active_cases: 24,
  high_risk: 7,
  critical_risk: 3,
  evidence_uploaded_today: 41,
  ai_summaries_generated: 12,
  timeline_events_processed: 387,
  pattern_matches_found: 2,
  cases_by_status: { active: 24, pending_review: 8, closed: 142 },
  recent_alerts: [
    { id: 1, severity: 'critical', text: 'Pattern match 94% — AIV-2026-0112 ↔ AIV-2025-0891', time: '08m ago' },
    { id: 2, severity: 'high', text: 'TOD inconsistency detected in AIV-2026-0117', time: '34m ago' },
    { id: 3, severity: 'medium', text: 'New evidence uploaded — AIV-2026-0098 (3 files)', time: '1h ago' },
    { id: 4, severity: 'high', text: 'Risk score escalated: AIV-2026-0118 (71 → 87)', time: '2h ago' },
    { id: 5, severity: 'medium', text: 'CCTV gap detected in timeline reconstruction', time: '3h ago' },
  ],
  weekly_activity: [
    { day: 'Mon', cases: 18, evidence: 64, alerts: 9 },
    { day: 'Tue', cases: 22, evidence: 71, alerts: 11 },
    { day: 'Wed', cases: 19, evidence: 58, alerts: 7 },
    { day: 'Thu', cases: 24, evidence: 82, alerts: 14 },
    { day: 'Fri', cases: 27, evidence: 91, alerts: 12 },
    { day: 'Sat', cases: 21, evidence: 47, alerts: 6 },
    { day: 'Sun', cases: 24, evidence: 41, alerts: 8 },
  ],
};

export const mockChatHistory = [
  {
    role: 'assistant',
    content:
      'AIVENTRA forensic assistant initialized. I have indexed 7 evidence items and 23 timeline events for case AIV-2026-0118. How can I assist your investigation?',
  },
];
