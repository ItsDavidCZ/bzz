// ── Haversine distance (metres) ───────────────────────────────────────────────
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── MET values for calorie calculation ───────────────────────────────────────
// Calories = MET × weight_kg × time_hours
// Source: Compendium of Physical Activities
const MET_TABLE = {
  run:  (speedKmh) => {
    // MET scales with running speed (approximate)
    if (speedKmh < 6)  return 6.0;
    if (speedKmh < 8)  return 8.3;
    if (speedKmh < 10) return 9.8;
    if (speedKmh < 12) return 11.0;
    if (speedKmh < 14) return 12.8;
    if (speedKmh < 16) return 14.5;
    return 16.0;
  },
  bike: (speedKmh) => {
    if (speedKmh < 16) return 4.0;
    if (speedKmh < 20) return 6.0;
    if (speedKmh < 25) return 8.0;
    if (speedKmh < 30) return 10.0;
    return 12.0;
  },
  walk: (_) => 3.5,
  hike: (_) => 6.0,
  swim: (_) => 7.0,
};

export function calcCalories(activityId, distanceM, durationSec, weightKg = 70) {
  if (durationSec <= 0) return 0;
  const hours = durationSec / 3600;
  const speedKmh = distanceM > 0 ? (distanceM / 1000) / hours : 0;
  const metFn = MET_TABLE[activityId] || (() => 7.0);
  const met = metFn(speedKmh);
  return Math.round(met * weightKg * hours);
}

// ── Pace (sec/km) ─────────────────────────────────────────────────────────────
export function calcPace(distanceM, durationSec) {
  if (distanceM < 10) return null;
  return (durationSec / (distanceM / 1000));
}

// ── Speed (km/h) ──────────────────────────────────────────────────────────────
export function calcSpeedKmh(distanceM, durationSec) {
  if (durationSec <= 0) return 0;
  return (distanceM / 1000) / (durationSec / 3600);
}

// ── Format helpers ────────────────────────────────────────────────────────────
export function fmtTime(sec, showHours = 'auto') {
  const totalSec = Math.max(0, Math.floor(sec));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (showHours === true || (showHours === 'auto' && h > 0)) {
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function fmtPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0 || secPerKm > 7200) return '--\'--"';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2,'0')}"`;
}

export function fmtDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}

export function fmtDistanceShort(metres) {
  return (metres / 1000).toFixed(2);
}

export function fmtSpeed(kmh) {
  return kmh.toFixed(1);
}

export function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Storage helpers ───────────────────────────────────────────────────────────
const STORAGE_KEY = 'fittrack_v3';

export async function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveHistorySync(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch(e) {
    console.warn('Storage full', e);
  }
}

// ── Route SVG ─────────────────────────────────────────────────────────────────
export function buildRoutePath(points, W, H, pad = 16) {
  if (points.length < 2) return null;
  const lats = points.map(p => p.lat);
  const lons = points.map(p => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const rangeH = maxLat - minLat || 0.0001;
  const rangeW = maxLon - minLon || 0.0001;
  // maintain aspect ratio
  const scaleX = (W - pad * 2) / rangeW;
  const scaleY = (H - pad * 2) / rangeH;
  const scale = Math.min(scaleX, scaleY);
  const offX = (W - rangeW * scale) / 2;
  const offY = (H - rangeH * scale) / 2;
  const toX = lon => offX + (lon - minLon) * scale;
  const toY = lat => H - offY - (lat - minLat) * scale;
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.lon).toFixed(1)},${toY(p.lat).toFixed(1)}`)
    .join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  return {
    d,
    endX: toX(last.lon),
    endY: toY(last.lat),
    startX: toX(first.lon),
    startY: toY(first.lat),
  };
}
