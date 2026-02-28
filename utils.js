import { useState, useEffect, useRef, useCallback } from 'react';
import { ACTIVITIES, getActivity } from './activities.js';
import {
  haversine, calcCalories, calcPace, calcSpeedKmh,
  fmtTime, fmtPace, fmtDistanceShort, fmtSpeed, fmtDate,
  loadHistory, saveHistorySync, buildRoutePath,
} from './utils.js';

// ─── Icons ───────────────────────────────────────────────────────────────────
const HomeIcon = ({ filled }) => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
      fill={filled ? '#FC4C02' : 'none'} stroke={filled ? '#FC4C02' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 22V12h6v10" stroke={filled ? '#FC4C02' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="#FC4C02"/>
    <path d="M12 7v10M7 12h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const ChartIcon = ({ filled }) => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
    <rect x="3" y="12" width="4" height="9" rx="1" fill={filled ? '#FC4C02' : 'none'} stroke={filled ? '#FC4C02' : '#9ca3af'} strokeWidth="2"/>
    <rect x="10" y="7" width="4" height="14" rx="1" fill={filled ? '#FC4C02' : 'none'} stroke={filled ? '#FC4C02' : '#9ca3af'} strokeWidth="2"/>
    <rect x="17" y="3" width="4" height="18" rx="1" fill={filled ? '#FC4C02' : 'none'} stroke={filled ? '#FC4C02' : '#9ca3af'} strokeWidth="2"/>
  </svg>
);

const ProfileIcon = ({ filled }) => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" fill={filled ? '#FC4C02' : 'none'} stroke={filled ? '#FC4C02' : '#9ca3af'} strokeWidth="2"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={filled ? '#FC4C02' : '#9ca3af'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const GpsIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" fill="#FC4C02"/>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#FC4C02" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="7" stroke="#FC4C02" strokeWidth="1.5" opacity="0.4"/>
  </svg>
);

// ─── Route SVG Component ──────────────────────────────────────────────────────
function RouteMap({ points, color, width = 300, height = 160, live = false }) {
  const route = buildRoutePath(points, width, height);
  if (!route) {
    return (
      <div style={{
        width: '100%', height, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 8,
        background: '#f9fafb', borderRadius: 12,
      }}>
        {live ? (
          <>
            <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
              <GpsIcon/>
            </div>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Čekám na GPS signál…</span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#d1d5db' }}>Trasa bez GPS</span>
        )}
      </div>
    );
  }
  const { d, endX, endY, startX, startY } = route;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ borderRadius: 12, background: '#f0f4f8' }}
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={0} y1={height * t} x2={width} y2={height * t}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4"/>
      ))}
      {/* Shadow path */}
      <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeLinejoin="round" opacity="0.15"/>
      {/* Main path */}
      <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeLinejoin="round"/>
      {/* Start dot */}
      <circle cx={startX} cy={startY} r="6" fill="white" stroke={color} strokeWidth="2"/>
      {/* End dot */}
      <circle cx={endX} cy={endY} r="6" fill={color}/>
      {live && (
        <>
          <circle cx={endX} cy={endY} r="12" fill={color} opacity="0.3">
            <animate attributeName="r" values="6;18;6" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
          </circle>
        </>
      )}
    </svg>
  );
}

// ─── Stat Block ───────────────────────────────────────────────────────────────
function StatBlock({ label, value, unit, large = false, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
        <span style={{
          fontSize: large ? 42 : 28,
          fontWeight: 700,
          lineHeight: 1,
          color: color || '#1a1a1a',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: large ? 14 : 11, fontWeight: 500, color: '#9ca3af' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Activity Card (history) ──────────────────────────────────────────────────
function ActivityCard({ entry, onClick }) {
  const act = getActivity(entry.actId);
  const distKm = (entry.distanceM / 1000).toFixed(2);
  const pace = calcPace(entry.distanceM, entry.duration);
  const speed = calcSpeedKmh(entry.distanceM, entry.duration);

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '16px 18px',
        marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        active: { transform: 'scale(0.98)' },
      }}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
      onTouchEnd={e => e.currentTarget.style.transform = ''}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: act.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          {act.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{act.label}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
            {fmtDate(entry.date)} · {entry.time}
          </div>
        </div>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Mini route */}
      {entry.points && entry.points.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <RouteMap points={entry.points} color={act.color} width={340} height={100}/>
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid #f3f4f6',
        paddingTop: 12,
        gap: 0,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vzdálenost</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{distKm} <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>km</span></div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Čas</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(entry.duration)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {act.usesPace ? 'Tempo' : 'Rychlost'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {act.usesPace
              ? (pace ? fmtPace(pace) : '--')
              : `${fmtSpeed(speed)} km/h`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GPS Hook ─────────────────────────────────────────────────────────────────
function useGPS(active) {
  const [status, setStatus] = useState('idle'); // idle | acquiring | ok | denied | unavailable
  const [points, setPoints] = useState([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [altitude, setAltitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const distRef = useRef(0);
  const lastPosRef = useRef(null);
  const watchRef = useRef(null);
  const [totalDistance, setTotalDistance] = useState(0);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('acquiring');
    distRef.current = 0;
    lastPosRef.current = null;
    setPoints([]);
    setTotalDistance(0);
    setCurrentSpeed(0);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, speed, altitude: alt, accuracy: acc } = pos.coords;

        setStatus('ok');
        setCurrentSpeed(speed > 0 ? speed : 0);
        setAltitude(alt);
        setAccuracy(acc);

        // Add point
        const newPoint = { lat, lon };
        setPoints(prev => {
          // Deduplicate consecutive identical points
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (Math.abs(last.lat - lat) < 0.000001 && Math.abs(last.lon - lon) < 0.000001) return prev;
          }
          return [...prev, newPoint];
        });

        // Accumulate distance with noise filter
        if (lastPosRef.current && acc < 25) {
          const d = haversine(lastPosRef.current.lat, lastPosRef.current.lon, lat, lon);
          if (d > 1 && d < 200) { // min 1m, max 200m per tick (prevents teleport jumps)
            distRef.current += d;
            setTotalDistance(distRef.current);
          }
        }
        if (!lastPosRef.current || acc < 20) {
          lastPosRef.current = { lat, lon };
        }
      },
      (err) => {
        if (err.code === 1) setStatus('denied');
        else setStatus('acquiring');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }, []);

  const stop = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setStatus('idle');
  }, []);

  // Distance ref stays live
  const getDistance = () => distRef.current;

  return { status, points, currentSpeed, altitude, accuracy, totalDistance, start, stop, getDistance };
}

// ─── Timer Hook ───────────────────────────────────────────────────────────────
function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = () => {
    setElapsed(0);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const resume = () => setRunning(true);
  const stop = () => { setRunning(false); };
  const reset = () => { setElapsed(0); setRunning(false); };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  return { elapsed, running, start, pause, resume, stop, reset };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Home screen ──────────────────────────────────────────────────────────────
function HomeScreen({ history, onNewActivity, onOpenActivity }) {
  const totalKm = history.reduce((s, h) => s + h.distanceM / 1000, 0);
  const totalCal = history.reduce((s, h) => s + h.calories, 0);
  const totalTime = history.reduce((s, h) => s + h.duration, 0);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Dobré ráno' : now.getHours() < 18 ? 'Dobré odpoledne' : 'Dobrý večer';

  return (
    <div className="scroll-area fade-up" style={{ flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #FC4C02 0%, #FF6B35 100%)',
        padding: '52px 20px 28px',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
          {greeting} 👋
        </div>
        <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 24 }}>
          Připrav se na dnešní výzvu!
        </div>

        {/* Weekly summary */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: '16px 20px',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Celkové statistiky
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Kilometrů', val: totalKm.toFixed(1), unit: 'km' },
              { label: 'Kalorií', val: totalCal.toLocaleString(), unit: 'kcal' },
              { label: 'Aktivit', val: history.length, unit: '' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                  {s.val}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{s.unit && ` ${s.unit}`}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 120px' }}>
        {/* Quick start */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 }}>Rychlý start</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {ACTIVITIES.map(act => (
              <button
                key={act.id}
                onClick={() => onNewActivity(act)}
                style={{
                  background: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  padding: '16px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.1s',
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onTouchEnd={e => e.currentTarget.style.transform = ''}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: act.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {act.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{act.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{act.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activities */}
        {history.length > 0 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 14 }}>Poslední aktivity</div>
            {history.slice(0, 5).map(entry => (
              <ActivityCard key={entry.id} entry={entry} onClick={() => onOpenActivity(entry)}/>
            ))}
          </div>
        )}

        {history.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: '#fff', borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏅</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', marginBottom: 6 }}>Začni svou první aktivitu!</div>
            <div style={{ fontSize: 14, color: '#9ca3af' }}>Klepni na aktivitu výše a vyraž ven.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Select screen ───────────────────────────────────────────────────
function SelectScreen({ onSelect, onClose }) {
  return (
    <div className="fade-up" style={{
      position: 'fixed', inset: 0, background: '#fff', zIndex: 50,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '52px 20px 20px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#1a1a1a' }}>Vyber aktivitu</div>
      </div>

      <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
        {ACTIVITIES.map(act => (
          <button
            key={act.id}
            onClick={() => onSelect(act)}
            style={{
              width: '100%', background: '#fff', border: '1px solid #f3f4f6',
              borderRadius: 16, padding: '18px 16px',
              display: 'flex', alignItems: 'center', gap: 16,
              marginBottom: 10, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'transform 0.1s, border-color 0.15s',
              textAlign: 'left',
            }}
            onTouchStart={e => { e.currentTarget.style.transform='scale(0.98)'; e.currentTarget.style.borderColor=act.color+'66'; }}
            onTouchEnd={e => { e.currentTarget.style.transform=''; e.currentTarget.style.borderColor=''; }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: act.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>
              {act.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a' }}>{act.label}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{act.description}</div>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: act.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" stroke={act.color} strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Active workout screen ────────────────────────────────────────────────────
function ActiveScreen({ activity, onFinish, onCancel }) {
  const { elapsed, running, start, pause, resume, stop } = useTimer();
  const { status, points, currentSpeed, totalDistance, start: startGPS, stop: stopGPS, getDistance } = useGPS();
  const [phase, setPhase] = useState('pre'); // pre | active | paused | done
  const [confirmCancel, setConfirmCancel] = useState(false);

  // derived metrics
  const distM = totalDistance;
  const distKm = distM / 1000;
  const pace = calcPace(distM, elapsed);    // sec/km
  const speedKmh = currentSpeed > 0
    ? currentSpeed * 3.6
    : calcSpeedKmh(distM, elapsed);
  const calories = calcCalories(activity.id, distM, elapsed);

  const handleStart = () => {
    start();
    startGPS();
    setPhase('active');
  };

  const handlePause = () => {
    pause();
    setPhase('paused');
  };

  const handleResume = () => {
    resume();
    setPhase('active');
  };

  const handleFinish = () => {
    stop();
    stopGPS();
    const entry = {
      id: Date.now(),
      actId: activity.id,
      date: new Date().toISOString(),
      time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      duration: elapsed,
      distanceM: Math.round(getDistance()),
      calories: calcCalories(activity.id, getDistance(), elapsed),
      avgPace: calcPace(getDistance(), elapsed),
      avgSpeedKmh: calcSpeedKmh(getDistance(), elapsed),
      points: points.length > 500 ? points.filter((_, i) => i % Math.ceil(points.length / 500) === 0) : points,
    };
    onFinish(entry);
  };

  const gpsColor = {
    idle: '#9ca3af', acquiring: '#F59E0B', ok: '#10B981', denied: '#EF4444', unavailable: '#EF4444',
  }[status];

  const gpsLabel = {
    idle: 'GPS', acquiring: 'Hledám GPS…', ok: 'GPS aktivní', denied: 'GPS zamítnuto', unavailable: 'GPS nedostupné',
  }[status];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#fff', zIndex: 50,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '52px 20px 16px',
        background: activity.color,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {activity.emoji}
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{activity.label}</div>
        </div>
        {/* GPS indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.15)', borderRadius: 20,
          padding: '6px 12px',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: gpsColor,
            animation: status === 'acquiring' ? 'pulse 1s ease-in-out infinite' : 'none',
          }}/>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{gpsLabel}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {/* Timer - BIG */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#1a1a1a',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -2,
            lineHeight: 1,
            fontFamily: 'DM Mono, monospace',
          }}>
            {fmtTime(elapsed, true)}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6, fontWeight: 500 }}>
            {phase === 'pre' && 'Připraven ke startu'}
            {phase === 'active' && 'Probíhá aktivita'}
            {phase === 'paused' && '⏸ Pozastaveno'}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12, marginBottom: 20,
        }}>
          {/* Distance */}
          <div style={{
            background: '#f9fafb', borderRadius: 16, padding: '18px 16px',
            gridColumn: '1 / -1',
            display: 'flex', justifyContent: 'center',
          }}>
            <StatBlock
              label="Vzdálenost"
              value={distKm.toFixed(3)}
              unit="km"
              large
              color={activity.color}
            />
          </div>

          {/* Pace or Speed */}
          <div style={{ background: '#f9fafb', borderRadius: 16, padding: '18px 14px' }}>
            <StatBlock
              label={activity.usesPace ? 'Aktuální tempo' : 'Rychlost'}
              value={activity.usesPace ? (pace ? fmtPace(pace) : "--'--\"") : fmtSpeed(speedKmh)}
              unit={activity.usesPace ? 'min/km' : 'km/h'}
            />
          </div>

          {/* Calories */}
          <div style={{ background: '#f9fafb', borderRadius: 16, padding: '18px 14px' }}>
            <StatBlock label="Kalorie" value={calories} unit="kcal"/>
          </div>
        </div>

        {/* Route */}
        <div style={{
          background: '#f9fafb', borderRadius: 16, padding: 4,
          marginBottom: 24, overflow: 'hidden',
        }}>
          <RouteMap points={points} color={activity.color} width={340} height={140} live/>
        </div>

        {/* GPS denied notice */}
        {status === 'denied' && (
          <div style={{
            background: '#FFF5F5', border: '1px solid #fca5a5',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#b91c1c', marginBottom: 2 }}>GPS není dostupné</div>
              <div style={{ fontSize: 12, color: '#dc2626', lineHeight: 1.5 }}>
                Vzdálenost se nepočítá. Povol polohu v nastavení prohlížeče a obnov stránku.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        padding: `16px 20px calc(20px + var(--safe-bottom))`,
        borderTop: '1px solid #f3f4f6',
        background: '#fff',
      }}>
        {phase === 'pre' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { onCancel(); }}
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#f3f4f6', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M19 12H5M12 5l-7 7 7 7" stroke="#4a4a4a" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button onClick={handleStart}
              style={{
                flex: 1, height: 52, borderRadius: 14,
                background: activity.color, border: 'none', cursor: 'pointer',
                color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: 0.5,
              }}>
              Spustit aktivitu
            </button>
          </div>
        )}

        {phase === 'active' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePause}
              style={{
                flex: 1, height: 56, borderRadius: 14,
                background: '#f3f4f6', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 16, color: '#4a4a4a',
              }}>
              ⏸ Pauza
            </button>
            <button
              onClick={() => { if (elapsed > 5) handleFinish(); }}
              style={{
                flex: 1, height: 56, borderRadius: 14,
                background: '#1a1a1a', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 16, color: '#fff',
              }}>
              Ukončit
            </button>
          </div>
        )}

        {phase === 'paused' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setConfirmCancel(true)}
              style={{
                width: 56, height: 56, borderRadius: 14,
                background: '#FFF5F5', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button onClick={handleResume}
              style={{
                flex: 1, height: 56, borderRadius: 14,
                background: activity.color, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 16, color: '#fff',
              }}>
              ▶ Pokračovat
            </button>
            <button onClick={handleFinish}
              style={{
                flex: 1, height: 56, borderRadius: 14,
                background: '#1a1a1a', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 16, color: '#fff',
              }}>
              Uložit
            </button>
          </div>
        )}
      </div>

      {/* Confirm cancel dialog */}
      {confirmCancel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', padding: '0 0 0',
        }}>
          <div style={{
            background: '#fff', width: '100%', borderRadius: '24px 24px 0 0',
            padding: `24px 20px calc(32px + var(--safe-bottom))`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a1a1a', marginBottom: 8 }}>Zahodit aktivitu?</div>
            <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>
              Aktivita nebude uložena.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmCancel(false)}
                style={{ flex: 1, height: 52, borderRadius: 14, background: '#f3f4f6', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#4a4a4a' }}>
                Zpět
              </button>
              <button onClick={() => { stopGPS(); stop(); onCancel(); }}
                style={{ flex: 1, height: 52, borderRadius: 14, background: '#EF4444', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                Zahodit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary screen ───────────────────────────────────────────────────────────
function SummaryScreen({ entry, onClose }) {
  const act = getActivity(entry.actId);
  const distKm = (entry.distanceM / 1000).toFixed(3);
  const speed = entry.avgSpeedKmh;

  const stats = [
    { label: 'Vzdálenost', value: distKm, unit: 'km' },
    { label: 'Čistý čas', value: fmtTime(entry.duration, true), unit: '' },
    act.usesPace
      ? { label: 'Průměrné tempo', value: entry.avgPace ? fmtPace(entry.avgPace) : '--', unit: 'min/km' }
      : { label: 'Průměrná rychlost', value: fmtSpeed(speed), unit: 'km/h' },
    { label: 'Kalorie', value: entry.calories, unit: 'kcal' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#fff', zIndex: 50,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${act.color} 0%, ${act.color}CC 100%)`,
        padding: '52px 20px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🏅</div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 26, marginBottom: 4 }}>Aktivita dokončena!</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{act.label} · {entry.time}</div>
      </div>

      <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>
        {/* Route */}
        {entry.points && entry.points.length > 1 && (
          <div style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden' }}>
            <RouteMap points={entry.points} color={act.color} width={340} height={160}/>
          </div>
        )}

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginBottom: 24,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: '#f9fafb', borderRadius: 14, padding: '18px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </span>
                {s.unit && <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{s.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Motivational message */}
        <div style={{
          background: act.bg, borderRadius: 14, padding: '16px 18px',
          borderLeft: `4px solid ${act.color}`, marginBottom: 20,
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: act.color, marginBottom: 4 }}>
            Skvělý výkon! 💪
          </div>
          <div style={{ fontSize: 13, color: '#4a4a4a', lineHeight: 1.5 }}>
            {entry.distanceM > 5000
              ? 'Výjimečný výkon! Udržuješ skvělé tempo.'
              : entry.distanceM > 1000
                ? 'Dobrá práce! Každý krok se počítá.'
                : 'Začátek je za tebou. Příště jedeš dál!'}
          </div>
        </div>
      </div>

      <div style={{ padding: `16px 20px calc(20px + var(--safe-bottom))`, borderTop: '1px solid #f3f4f6' }}>
        <button onClick={onClose}
          style={{
            width: '100%', height: 54, borderRadius: 14,
            background: act.color, border: 'none', cursor: 'pointer',
            color: '#fff', fontWeight: 700, fontSize: 17,
          }}>
          Hotovo ✓
        </button>
      </div>
    </div>
  );
}

// ─── Stats screen ─────────────────────────────────────────────────────────────
function StatsScreen({ history }) {
  const totalKm = history.reduce((s, h) => s + h.distanceM / 1000, 0);
  const totalCal = history.reduce((s, h) => s + h.calories, 0);
  const totalTime = history.reduce((s, h) => s + h.duration, 0);

  // Count by activity
  const byActivity = ACTIVITIES.map(act => ({
    ...act,
    count: history.filter(h => h.actId === act.id).length,
    km: history.filter(h => h.actId === act.id).reduce((s, h) => s + h.distanceM / 1000, 0),
  })).filter(a => a.count > 0);

  // Best single activity
  const best = history.reduce((best, h) => (!best || h.distanceM > best.distanceM ? h : best), null);

  return (
    <div className="scroll-area fade-up" style={{ flex: 1, overflowY: 'auto', padding: '0 0 100px' }}>
      <div style={{ padding: '52px 20px 20px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a' }}>Statistiky</div>
      </div>

      <div style={{ padding: '20px' }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#4a4a4a', marginBottom: 6 }}>Zatím žádná data</div>
            <div style={{ fontSize: 14 }}>Zaznamenej svoji první aktivitu!</div>
          </div>
        ) : (
          <>
            {/* Total overview */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 16 }}>Celkem</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Aktivit', value: history.length, unit: '' },
                  { label: 'Vzdálenost', value: totalKm.toFixed(1), unit: 'km' },
                  { label: 'Čas pohybu', value: fmtTime(totalTime, true), unit: '' },
                  { label: 'Kalorie', value: totalCal.toLocaleString(), unit: 'kcal' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: '14px 12px' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {s.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                      {s.unit && <span style={{ fontSize: 12, color: '#9ca3af' }}>{s.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By activity */}
            {byActivity.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 14 }}>Podle aktivity</div>
                {byActivity.map(act => (
                  <div key={act.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    paddingBottom: 12, marginBottom: 12,
                    borderBottom: '1px solid #f3f4f6',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: act.bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 20, flexShrink: 0,
                    }}>
                      {act.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{act.label}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{act.count}× · {act.km.toFixed(1)} km</div>
                      {/* Progress bar */}
                      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2, background: act.color,
                          width: `${Math.min((act.count / history.length) * 100, 100)}%`,
                          transition: 'width 0.5s ease',
                        }}/>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: act.color }}>{act.count}×</div>
                  </div>
                ))}
              </div>
            )}

            {/* Best effort */}
            {best && (
              <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 14 }}>Nejlepší aktivita</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: getActivity(best.actId).bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {getActivity(best.actId).emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{getActivity(best.actId).label}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{fmtDate(best.date)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { l: 'Vzdálenost', v: `${(best.distanceM/1000).toFixed(2)} km` },
                    { l: 'Čas', v: fmtTime(best.duration) },
                    { l: 'Kalorie', v: `${best.calories} kcal` },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 10, padding: '10px 8px' }}>
                      <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginTop: 3 }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Profile screen ───────────────────────────────────────────────────────────
function ProfileScreen({ history, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const totalKm = history.reduce((s, h) => s + h.distanceM / 1000, 0);

  // Achievement unlocks
  const achievements = [
    { emoji: '🏅', title: 'První krok', desc: 'Zaznamenej svou první aktivitu', unlocked: history.length >= 1 },
    { emoji: '🚀', title: '5 aktivit', desc: 'Zaznamenej 5 aktivit', unlocked: history.length >= 5 },
    { emoji: '🌟', title: '10 km', desc: 'Ujdi / uběhni celkem 10 km', unlocked: totalKm >= 10 },
    { emoji: '🔥', title: '50 km', desc: 'Ujdi / uběhni celkem 50 km', unlocked: totalKm >= 50 },
    { emoji: '💎', title: '100 km', desc: 'Celkem 100 km — legenda!', unlocked: totalKm >= 100 },
    { emoji: '🏆', title: 'Všestranný', desc: 'Vyzkoušej 3 různé aktivity', unlocked: new Set(history.map(h => h.actId)).size >= 3 },
  ];

  return (
    <div className="scroll-area fade-up" style={{ flex: 1, overflowY: 'auto', padding: '0 0 100px' }}>
      {/* Profile header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '52px 20px 28px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FC4C02, #FF6B35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 14px',
          border: '3px solid rgba(255,255,255,0.15)',
        }}>
          🏃
        </div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Sportovec</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{history.length} aktivit · {totalKm.toFixed(1)} km celkem</div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Achievements */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 14 }}>Odznaky</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {achievements.map((a, i) => (
              <div key={i} style={{
                background: a.unlocked ? '#f9fafb' : '#fafafa',
                borderRadius: 12, padding: '12px',
                opacity: a.unlocked ? 1 : 0.4,
                border: a.unlocked ? '1px solid #e5e7eb' : '1px dashed #e5e7eb',
                transition: 'opacity 0.3s',
              }}>
                <div style={{ fontSize: 26, marginBottom: 6, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>{a.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', marginBottom: 14 }}>Data</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14, lineHeight: 1.5 }}>
            Všechny aktivity jsou uloženy lokálně v prohlížeči.
          </div>
          <button onClick={() => setConfirmClear(true)}
            style={{
              width: '100%', height: 46, borderRadius: 12,
              background: '#FFF5F5', border: '1px solid #fca5a5',
              color: '#EF4444', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
            Smazat všechny aktivity
          </button>
        </div>
      </div>

      {confirmClear && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: '#fff', width: '100%', borderRadius: '24px 24px 0 0',
            padding: `24px 20px calc(32px + var(--safe-bottom))`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a1a1a', marginBottom: 8 }}>Smazat vše?</div>
            <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>Tato akce je nevratná. Všechny záznamy budou trvale odstraněny.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmClear(false)}
                style={{ flex: 1, height: 52, borderRadius: 14, background: '#f3f4f6', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#4a4a4a' }}>
                Zrušit
              </button>
              <button onClick={() => { onClear(); setConfirmClear(false); }}
                style={{ flex: 1, height: 52, borderRadius: 14, background: '#EF4444', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#fff' }}>
                Smazat vše
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState('home');           // home | stats | profile
  const [overlay, setOverlay] = useState(null);      // null | 'select' | 'active' | 'summary'
  const [pendingActivity, setPendingActivity] = useState(null);
  const [lastEntry, setLastEntry] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load history on mount
  useEffect(() => {
    loadHistory().then(h => {
      setHistory(h);
      setHistoryLoaded(true);
    });
  }, []);

  const handleSelectActivity = (act) => {
    setPendingActivity(act);
    setOverlay('active');
  };

  const handleFinishWorkout = (entry) => {
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    saveHistorySync(newHistory);
    setLastEntry(entry);
    setOverlay('summary');
  };

  const handleSummaryClose = () => {
    setOverlay(null);
    setPendingActivity(null);
    setLastEntry(null);
    setTab('home');
  };

  const handleClearHistory = () => {
    setHistory([]);
    saveHistorySync([]);
  };

  if (!historyLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏃</div>
          <div style={{ color: '#FC4C02', fontWeight: 700, fontSize: 18 }}>FitTrack</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main tab content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tab === 'home' && (
          <HomeScreen
            history={history}
            onNewActivity={(act) => { setPendingActivity(act); setOverlay('active'); }}
            onOpenActivity={() => {}}
          />
        )}
        {tab === 'stats' && <StatsScreen history={history}/>}
        {tab === 'profile' && <ProfileScreen history={history} onClear={handleClearHistory}/>}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #f3f4f6',
        display: 'flex',
        alignItems: 'center',
        paddingBottom: 'var(--safe-bottom)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Home */}
        <button onClick={() => setTab('home')}
          style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <HomeIcon filled={tab === 'home'}/>
          <span style={{ fontSize: 11, fontWeight: tab === 'home' ? 700 : 500, color: tab === 'home' ? '#FC4C02' : '#9ca3af' }}>Domů</span>
        </button>

        {/* Record (center) */}
        <button onClick={() => setOverlay('select')}
          style={{ flex: 1, background: 'none', border: 'none', padding: '8px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <PlusIcon/>
          <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>Zaznamenat</span>
        </button>

        {/* Stats */}
        <button onClick={() => setTab('stats')}
          style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <ChartIcon filled={tab === 'stats'}/>
          <span style={{ fontSize: 11, fontWeight: tab === 'stats' ? 700 : 500, color: tab === 'stats' ? '#FC4C02' : '#9ca3af' }}>Statistiky</span>
        </button>

        {/* Profile */}
        <button onClick={() => setTab('profile')}
          style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <ProfileIcon filled={tab === 'profile'}/>
          <span style={{ fontSize: 11, fontWeight: tab === 'profile' ? 700 : 500, color: tab === 'profile' ? '#FC4C02' : '#9ca3af' }}>Profil</span>
        </button>
      </div>

      {/* Overlays */}
      {overlay === 'select' && (
        <SelectScreen
          onSelect={(act) => { setPendingActivity(act); setOverlay('active'); }}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay === 'active' && pendingActivity && (
        <ActiveScreen
          activity={pendingActivity}
          onFinish={handleFinishWorkout}
          onCancel={() => { setOverlay(null); setPendingActivity(null); }}
        />
      )}

      {overlay === 'summary' && lastEntry && (
        <SummaryScreen entry={lastEntry} onClose={handleSummaryClose}/>
      )}
    </>
  );
}
