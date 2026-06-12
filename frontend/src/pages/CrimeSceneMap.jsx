import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import {
  MapPin,
  Camera,
  Crosshair,
  User,
  Play,
  Pause,
  RotateCcw,
  Cloud,
  Layers,
  Thermometer,
  Search,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import { mockGeoMarkers, mockSuspectPath } from '../data/mockData';
import { casesService, geoService } from '../services/firestore.js';
import { geocodeApi } from '../services/api.js';

// Fix default Leaflet icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const markerColors = {
  crime_scene: '#ff3358',
  evidence: '#00e5ff',
  cctv: '#fbbf24',
  suspect: '#a78bfa',
  witness: '#34d399',
};

const makeIcon = (type) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${markerColors[type] || '#00e5ff'};
      width:22px;height:22px;border-radius:50%;
      border:3px solid #0a0d14;
      box-shadow:0 0 12px ${markerColors[type] || '#00e5ff'}80;
      display:grid;place-items:center;
      color:#0a0d14;font-size:10px;font-weight:700;
    ">${type[0].toUpperCase()}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    const valid = markers.filter(
      (m) =>
        typeof m.lat === 'number' &&
        typeof m.lng === 'number' &&
        !Number.isNaN(m.lat) &&
        !Number.isNaN(m.lng),
    );
    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [markers, map]);
  return null;
}

export default function CrimeSceneMap() {
  const [activeLayers, setActiveLayers] = useState({
    crime_scene: true,
    evidence: true,
    cctv: true,
    suspect: true,
    witness: true,
    path: true,
    radius: true,
    heatmap: false,
  });
  const [playing, setPlaying] = useState(false);
  const [playheadIndex, setPlayheadIndex] = useState(0);
  const intervalRef = useRef(null);

  // Live data state (case + geo markers from Firestore)
  const [activeCase, setActiveCase] = useState(null);
  const [cases, setCases] = useState([]);
  const [markers, setMarkers] = useState(mockGeoMarkers);
  const [usingLiveData, setUsingLiveData] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [bodyMarker, setBodyMarker] = useState(null);

  // Load all cases on mount so investigator can pick one
  useEffect(() => {
    casesService
      .list()
      .then((rows) => {
        if (rows.length) {
          setCases(rows);
          // Default to the first active critical case if any
          const first = rows.find((c) => c.risk_level === 'critical') || rows[0];
          setActiveCase(first);
        }
      })
      .catch((e) => console.warn('[map] cases load failed:', e?.code || e));
  }, []);

  // When an active case is selected, load its markers (or geocode the address)
  useEffect(() => {
    if (!activeCase?.id) return;

    const loadCase = async () => {
      try {
        const liveMarkers = await geoService.listForCase(activeCase.id);
        if (liveMarkers.length) {
          setMarkers(liveMarkers);
          setUsingLiveData(true);
          const body = liveMarkers.find((m) => m.type === 'crime_scene');
          if (body) setBodyMarker(body);
          return;
        }
      } catch (e) {
        console.warn('[map] geo list failed:', e?.code || e);
      }

      // No markers exist for this case → geocode the case location string
      if (activeCase.location) {
        setGeocoding(true);
        try {
          const res = await geocodeApi.forward(activeCase.location, 1);
          if (res.best) {
            const persisted = await geoService.upsertBodyLocation(activeCase.id, {
              lat: res.best.lat,
              lng: res.best.lng,
              label: `Body location · ${activeCase.case_number}`,
              note: 'Auto-geocoded from case location. Drag to refine.',
              address: res.best.display_name,
            });
            const m = {
              id: persisted.id,
              case_id: activeCase.id,
              type: 'crime_scene',
              lat: res.best.lat,
              lng: res.best.lng,
              label: persisted.label,
              note: persisted.note,
              address: res.best.display_name,
            };
            setMarkers([m]);
            setBodyMarker(m);
            setUsingLiveData(true);
            toast.success(`Located: ${res.best.display_name.slice(0, 60)}…`);
          } else {
            // fall back to mock
            setMarkers(mockGeoMarkers);
            setUsingLiveData(false);
            toast.error(`Could not geocode "${activeCase.location}"`);
          }
        } catch (e) {
          console.warn('[map] geocoding failed:', e?.message);
          setMarkers(mockGeoMarkers);
          setUsingLiveData(false);
        } finally {
          setGeocoding(false);
        }
      } else {
        setMarkers(mockGeoMarkers);
        setUsingLiveData(false);
      }
    };

    loadCase();
  }, [activeCase?.id]);

  const handleBodyMarkerDragEnd = async (e) => {
    if (!activeCase?.id || !bodyMarker) return;
    const { lat, lng } = e.target.getLatLng();
    try {
      // reverse-geocode the new spot for display
      let address = '';
      try {
        const rev = await geocodeApi.reverse(lat, lng);
        address = rev?.display_name || '';
      } catch (_) {
        /* non-fatal */
      }

      await geoService.upsertBodyLocation(activeCase.id, {
        lat,
        lng,
        label: bodyMarker.label,
        note: 'Manually refined by investigator',
        address,
      });
      setBodyMarker({ ...bodyMarker, lat, lng, address });
      setMarkers((prev) =>
        prev.map((m) => (m.id === bodyMarker.id ? { ...m, lat, lng, address } : m)),
      );
      toast.success('Body location updated');
    } catch (err) {
      console.warn('[map] persist drag failed:', err?.code || err);
      toast.error('Could not save new location');
    }
  };

  // Filter out any marker missing valid coordinates BEFORE Leaflet sees it.
  // (Firestore docs may have null/undefined lat/lng if the user partially saved one.)
  const isValidLatLng = (m) =>
    m &&
    typeof m.lat === 'number' &&
    typeof m.lng === 'number' &&
    !Number.isNaN(m.lat) &&
    !Number.isNaN(m.lng);

  const filteredMarkers = useMemo(
    () => markers.filter((m) => isValidLatLng(m) && activeLayers[m.type]),
    [markers, activeLayers],
  );

  const sceneCenter = useMemo(() => {
    const validMarkers = markers.filter(isValidLatLng);
    return (
      validMarkers.find((m) => m.type === 'crime_scene') ||
      validMarkers[0] ||
      mockGeoMarkers[0]
    );
  }, [markers]);

  // Defensive center coords for Leaflet — falls back to Chennai if everything is broken
  const safeCenter = [
    typeof sceneCenter?.lat === 'number' && !Number.isNaN(sceneCenter.lat) ? sceneCenter.lat : 13.0339,
    typeof sceneCenter?.lng === 'number' && !Number.isNaN(sceneCenter.lng) ? sceneCenter.lng : 80.2619,
  ];

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setPlayheadIndex((i) => {
          if (i >= mockSuspectPath.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 600);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  const toggleLayer = (key) =>
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const visiblePath = mockSuspectPath.slice(0, playheadIndex + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 04"
        title="Crime Scene Map Intelligence"
        description="Geospatial forensic intelligence — evidence pins, suspect trajectory, CCTV coverage and timeline playback."
        badge={{
          label: usingLiveData ? 'Live · Firestore' : 'Demo mode',
          tone: usingLiveData ? 'green' : 'cyan',
        }}
      />

      {/* Case picker */}
      <div className="panel p-3 flex flex-wrap items-center gap-3">
        <Search className="w-4 h-4 text-zinc-500 ml-2" />
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Active case
        </span>
        <select
          value={activeCase?.id || ''}
          onChange={(e) => {
            const c = cases.find((x) => x.id === e.target.value);
            if (c) setActiveCase(c);
          }}
          className="flex-1 min-w-[260px] bg-ink-900 border border-ink-700 rounded-md px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-neon-cyan focus:outline-none"
        >
          {cases.length === 0 && <option value="">No cases — using demo data</option>}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_number} · {c.title?.slice(0, 50)} · {c.location?.slice(0, 30)}
            </option>
          ))}
        </select>
        {geocoding && (
          <span className="text-[10px] font-mono text-neon-cyan flex items-center gap-1.5 animate-pulse">
            <Save className="w-3 h-3" /> geocoding…
          </span>
        )}
        {usingLiveData && bodyMarker?.address && (
          <span className="text-[10px] font-mono text-zinc-500 truncate max-w-md">
            📍 {bodyMarker.address.slice(0, 80)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Control rail */}
        <div className="space-y-4">
          <Card title="Map Layers" eyebrow="Visibility" delay={0.05}>
            <div className="space-y-2">
              {Object.entries(activeLayers).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className="flex items-center justify-between w-full text-left group"
                >
                  <span className="text-xs font-mono uppercase tracking-wide text-zinc-400 group-hover:text-zinc-200">
                    {key.replace('_', ' ')}
                  </span>
                  <span
                    className={`w-8 h-4 rounded-full relative transition ${
                      val ? 'bg-neon-cyan/60' : 'bg-ink-800'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                        val ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Marker Legend" eyebrow="Symbology" delay={0.1}>
            <div className="space-y-2">
              {Object.entries(markerColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
                  />
                  <span className="text-xs font-mono text-zinc-300 uppercase">
                    {type.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Environmental" eyebrow="At time of incident" delay={0.15}>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Thermometer className="w-3 h-3" /> Temp
                </span>
                <span className="text-zinc-200">24.3 °C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Cloud className="w-3 h-3" /> Sky
                </span>
                <span className="text-zinc-200">Partly cloudy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Humidity</span>
                <span className="text-zinc-200">68 %</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Wind</span>
                <span className="text-zinc-200">12 km/h NE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Visibility</span>
                <span className="text-zinc-200">8.5 km</span>
              </div>
            </div>
          </Card>

          <Card title="Scene Risk Score" eyebrow="AI computed" delay={0.2} accent="red">
            <div className="text-center">
              <p className="font-display text-5xl text-neon-red leading-none">74</p>
              <p className="text-xs font-mono text-zinc-500 mt-2 uppercase tracking-wider">
                High
              </p>
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                CCTV coverage gap detected between 22:15 and 22:42 along eastern access route.
              </p>
            </div>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 space-y-4">
          <div className="panel p-0 overflow-hidden h-[560px] relative">
            <MapContainer
              center={safeCenter}
              zoom={15}
              style={{ height: '100%', width: '100%', background: '#0a0d14' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution=""
              />
              <FitBounds markers={filteredMarkers} />

              {/* Radius around primary crime scene */}
              {activeLayers.radius && (
                <>
                  <Circle
                    center={safeCenter}
                    radius={150}
                    pathOptions={{
                      color: '#ff3358',
                      weight: 1,
                      fillColor: '#ff3358',
                      fillOpacity: 0.06,
                      dashArray: '4 6',
                    }}
                  />
                  <Circle
                    center={safeCenter}
                    radius={400}
                    pathOptions={{
                      color: '#ff3358',
                      weight: 1,
                      opacity: 0.4,
                      fillColor: '#ff3358',
                      fillOpacity: 0.03,
                      dashArray: '2 8',
                    }}
                  />
                </>
              )}

              {/* Markers */}
              {filteredMarkers.map((m) => {
                if (!isValidLatLng(m)) return null;
                const isBody = m.type === 'crime_scene' && usingLiveData;
                return (
                  <Marker
                    key={m.id}
                    position={[m.lat, m.lng]}
                    icon={makeIcon(m.type)}
                    draggable={isBody}
                    eventHandlers={
                      isBody ? { dragend: handleBodyMarkerDragEnd } : undefined
                    }
                  >
                    <Popup>
                      <div style={{ minWidth: 200, fontFamily: 'JetBrains Mono' }}>
                        <div
                          style={{
                            color: markerColors[m.type],
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                          }}
                        >
                          {m.type.replace('_', ' ')}
                          {isBody ? ' · draggable' : ''}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#e4e4e7',
                            marginTop: 4,
                            fontWeight: 600,
                          }}
                        >
                          {m.label}
                        </div>
                        {m.address && (
                          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                            {m.address.slice(0, 100)}
                            {m.address.length > 100 ? '…' : ''}
                          </div>
                        )}
                        {m.note && (
                          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                            {m.note}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: '#71717a', marginTop: 6 }}>
                          {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Suspect path */}
              {activeLayers.path &&
                (() => {
                  const validPath = visiblePath.filter(
                    (p) =>
                      p &&
                      typeof p.lat === 'number' &&
                      typeof p.lng === 'number' &&
                      !Number.isNaN(p.lat) &&
                      !Number.isNaN(p.lng),
                  );
                  if (validPath.length < 2) return null;
                  return (
                    <Polyline
                      positions={validPath.map((p) => [p.lat, p.lng])}
                      pathOptions={{ color: '#a78bfa', weight: 3, opacity: 0.8, dashArray: '6 8' }}
                    />
                  );
                })()}

              {/* Live playhead marker */}
              {activeLayers.path &&
                (() => {
                  if (!visiblePath.length) return null;
                  const last = visiblePath[visiblePath.length - 1];
                  if (
                    !last ||
                    typeof last.lat !== 'number' ||
                    typeof last.lng !== 'number' ||
                    Number.isNaN(last.lat) ||
                    Number.isNaN(last.lng)
                  ) {
                    return null;
                  }
                  return (
                    <Marker
                      position={[last.lat, last.lng]}
                      icon={L.divIcon({
                        className: '',
                        html: `<div style="
                          background:#a78bfa;width:14px;height:14px;border-radius:50%;
                          border:3px solid #0a0d14;
                          box-shadow:0 0 14px #a78bfa;
                          animation: pulse 1.4s infinite;
                        "></div>`,
                        iconSize: [14, 14],
                        iconAnchor: [7, 7],
                      })}
                    />
                  );
                })()}
            </MapContainer>

            {/* Floating playback control */}
            <div className="absolute bottom-4 left-4 right-4 z-[400] panel px-4 py-3 flex items-center gap-4 bg-ink-950/85 backdrop-blur">
              <button
                onClick={() => setPlaying(!playing)}
                className="w-9 h-9 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 grid place-items-center hover:bg-neon-cyan/25 transition"
              >
                {playing ? (
                  <Pause className="w-4 h-4 text-neon-cyan" />
                ) : (
                  <Play className="w-4 h-4 text-neon-cyan ml-0.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setPlayheadIndex(0);
                }}
                className="w-9 h-9 rounded-lg border border-ink-700 grid place-items-center hover:border-ink-600 transition"
              >
                <RotateCcw className="w-4 h-4 text-zinc-400" />
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Timeline playback
                  </span>
                  <span className="text-[10px] font-mono text-neon-cyan">
                    {playheadIndex + 1} / {mockSuspectPath.length} ·{' '}
                    {mockSuspectPath[playheadIndex]?.time}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={mockSuspectPath.length - 1}
                  value={playheadIndex}
                  onChange={(e) => {
                    setPlaying(false);
                    setPlayheadIndex(parseInt(e.target.value));
                  }}
                  className="w-full accent-neon-cyan"
                />
              </div>
            </div>
          </div>

          {/* Geospatial insights row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Camera,
                title: 'CCTV Coverage',
                value: '64%',
                note: '3 active feeds within 400m radius',
                color: 'text-neon-amber',
              },
              {
                icon: Crosshair,
                title: 'Evidence Cluster',
                value: '5 items',
                note: 'Clustered within 80m of scene',
                color: 'text-neon-cyan',
              },
              {
                icon: User,
                title: 'Suspect Travel',
                value: '1.4 km',
                note: 'Across 9 GPS waypoints',
                color: 'text-violet-300',
              },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="panel p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label">{s.title}</span>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`font-display text-2xl ${s.color}`}>{s.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
