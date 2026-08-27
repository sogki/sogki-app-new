import * as Location from 'expo-location';
import type { LifePresence, LifePresenceCheckIn } from './types';

const MAX_CHECKINS = 200;
const MIN_HOURS_BETWEEN = 2;
const NOMINATIM_UA = 'EiPersonalAssistant/1.0 (sogki.dev; personal use)';

export function defaultPresence(): LifePresence {
  return {
    trackingEnabled: false,
    homeLabel: null,
    homeLat: null,
    homeLng: null,
    homeRadiusKm: 3,
    checkIns: [],
  };
}

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function reverseGeocodeLabel(lat: number, lng: number): Promise<string> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12`;
    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_UA } });
    if (!res.ok) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    const data = (await res.json()) as {
      name?: string;
      address?: { city?: string; town?: string; village?: string; suburb?: string; county?: string };
      display_name?: string;
    };
    const a = data.address ?? {};
    const place = a.city || a.town || a.village || a.suburb || a.county || data.name;
    if (place) return place;
    if (data.display_name) return data.display_name.split(',').slice(0, 2).join(',').trim();
  } catch {
    /* fall through */
  }
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

export type PresenceDayBucket = {
  day: string;
  away: number;
  home: number;
};

/** Last N days of check-in counts for a simple bar chart. */
export function presenceDayBuckets(
  checkIns: LifePresenceCheckIn[],
  days = 14
): PresenceDayBucket[] {
  const buckets: PresenceDayBucket[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      day: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      away: 0,
      home: 0,
    });
    for (const c of checkIns) {
      if ((c.at || '').slice(0, 10) !== key) continue;
      if (c.awayFromHome) buckets[buckets.length - 1].away += 1;
      else buckets[buckets.length - 1].home += 1;
    }
  }
  return buckets;
}

export function topAwayPlaces(checkIns: LifePresenceCheckIn[], limit = 5) {
  const map = new Map<string, { label: string; count: number; lastAt: string }>();
  for (const c of checkIns) {
    if (!c.awayFromHome) continue;
    const key = c.label.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { label: c.label, count: 1, lastAt: c.at });
    } else {
      prev.count += 1;
      if (c.at > prev.lastAt) prev.lastAt = c.at;
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit);
}

/**
 * Capture current location and merge into presence (deduped).
 * Returns null if tracking is off / permission denied / too soon.
 */
export async function maybeCheckIn(presence: LifePresence): Promise<LifePresence | null> {
  if (!presence.trackingEnabled) return null;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const now = new Date().toISOString();

  const latest = presence.checkIns[0];
  if (latest) {
    const hours =
      (Date.now() - new Date(latest.at).getTime()) / (1000 * 60 * 60);
    const movedKm = haversineKm(latest.lat, latest.lng, lat, lng);
    if (hours < MIN_HOURS_BETWEEN && movedKm < 1.5) return null;
  }

  const radius = presence.homeRadiusKm ?? 3;
  let awayFromHome = false;
  let distanceKm: number | undefined;
  if (
    typeof presence.homeLat === 'number' &&
    typeof presence.homeLng === 'number' &&
    Number.isFinite(presence.homeLat) &&
    Number.isFinite(presence.homeLng)
  ) {
    distanceKm = haversineKm(presence.homeLat, presence.homeLng, lat, lng);
    awayFromHome = distanceKm > radius;
  }

  const label = await reverseGeocodeLabel(lat, lng);
  const entry: LifePresenceCheckIn = {
    id: `here_${Date.now()}`,
    at: now,
    lat,
    lng,
    label,
    awayFromHome,
    ...(distanceKm != null ? { distanceKm: Math.round(distanceKm * 10) / 10 } : {}),
  };

  return {
    ...presence,
    checkIns: [entry, ...presence.checkIns].slice(0, MAX_CHECKINS),
  };
}

export async function captureHomeLocation(): Promise<{
  lat: number;
  lng: number;
  label: string;
} | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const label = await reverseGeocodeLabel(lat, lng);
  return { lat, lng, label };
}
