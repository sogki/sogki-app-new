import * as Location from 'expo-location';
import {
  buildFullOverview,
  buildGoalsOverview,
  buildHabitsOverview,
  buildInvestmentOverview,
  buildRemindersOverview,
  buildWeatherOverview,
  formatBriefMoney,
} from './eiOverview';
import { formatTime, greetingForHour } from './format';
import type { InvestmentSnapshot, LifeDashboardPayload, LifeWeather } from './types';

export type LocalAskContext = {
  payload: LifeDashboardPayload;
  investment: InvestmentSnapshot | null;
  weather?: LifeWeather | null;
};

const NOMINATIM_UA = 'EiPersonalAssistant/1.0 (sogki.dev; personal use)';

/**
 * Answer common assistant questions on-device (no cloud model).
 * Returns null when the question should go to the cloud model.
 */
export async function tryLocalEiReply(
  message: string,
  ctx: LocalAskContext
): Promise<string | null> {
  const q = normalize(message);
  if (!q) return null;

  // Greetings
  if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))\b/.test(q)) {
    const hour = new Date().getHours();
    return `${greetingForHour(hour)}. Ask me about your dashboard, location, IP, or something nearby — I can also dig into reminders and Vanguard.`;
  }

  if (/what can you (do|help)|help me|your (capabilities|skills)/.test(q)) {
    return [
      'I can help without the cloud for a lot of everyday stuff:',
      '',
      '• Dashboard — overview, habits, goals, reminders, job search, reading, weather',
      '• Vanguard — portfolio snapshot',
      '• Where you are — city, coordinates, public IP',
      '• Time & date',
      '• Store hours — e.g. “What time does Home Bargains close?”',
      '',
      'Type freely. If cloud chat is down, I still handle the list above.',
    ].join('\n');
  }

  // Time / date
  if (/\b(what('?s| is) the )?time\b|\bwhat time is it\b/.test(q) && !/close|open|bargain|shop|store/.test(q)) {
    const now = new Date();
    return `It's ${formatTime(now)} right now.`;
  }
  if (/\b(what('?s| is) (the |today'?s )?date|what day is it)\b/.test(q)) {
    const now = new Date();
    const label = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `Today is ${label}.`;
  }

  // Dashboard briefings
  if (/\b(overview|rundown|status|how am i doing|catch me up)\b/.test(q)) {
    return buildFullOverview(ctx.payload, ctx.investment);
  }
  if (/\breminder/.test(q) || /\bon my list\b/.test(q)) {
    return buildRemindersOverview(ctx.payload);
  }
  if (/\bhabit/.test(q)) {
    return buildHabitsOverview(ctx.payload);
  }
  if (/\b(vanguard|vuag|portfolio|investment|investments)\b/.test(q)) {
    return buildInvestmentOverview(ctx.investment);
  }
  if (/\bweather|temperature|forecast\b/.test(q)) {
    return buildWeatherOverview(ctx.payload, ctx.weather);
  }
  if (/\bgoal/.test(q)) {
    return buildGoalsOverview(ctx.payload) || 'No goals set yet.';
  }
  if (/\b(job search|applications?|interviews?)\b/.test(q)) {
    const j = ctx.payload.jobSearch;
    const lines = [
      'Job search',
      `• Applied: ${j.applicationsSent}`,
      `• Interviews: ${j.interviews}`,
      `• Offers: ${j.offers}`,
      `• Rejected: ${j.rejected}`,
    ];
    if (j.upcomingUcAppointment) {
      lines.push(
        `• Next UC: ${new Date(j.upcomingUcAppointment).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}`
      );
    }
    return lines.join('\n');
  }
  if (/\b(reading|book|page)\b/.test(q)) {
    const r = ctx.payload.reading;
    if (!r.currentBook) return 'No book set on the dashboard right now.';
    return [
      'Reading',
      `• ${r.currentBook} — ${r.author}`,
      `• p.${r.currentPage} / ${r.totalPages}`,
      `• Books completed: ${r.booksCompleted}`,
    ].join('\n');
  }
  if (/\bhow much.*(portfolio|vanguard|worth)\b/.test(q) && ctx.investment) {
    return `Your Vanguard portfolio is about ${formatBriefMoney(ctx.investment.portfolioValue)}.`;
  }

  // Network / location
  if (/\b(my )?ip( address)?\b|\bwhat('?s| is) my ip\b/.test(q)) {
    return await answerIp();
  }
  if (
    /\b(where am i|my (location|city|town|position)|what (city|town|location) am i in|current (city|location)|gps)\b/.test(
      q
    ) && !/\b(home bargains|asda|tesco|aldi|lidl|sainsbury|morrisons|shop|store|supermarket)\b/.test(q)
  ) {
    return await answerLocation(q);
  }

  // Any shop / supermarket — hours, address, postcode
  const placeQuery = parsePlaceQuery(message);
  if (placeQuery) {
    return await answerPlaceLookup(placeQuery);
  }

  return null;
}

/** Friendly offline fallback when cloud chat is unavailable. */
export async function offlineEiFallback(
  message: string,
  ctx: LocalAskContext
): Promise<string> {
  const local = await tryLocalEiReply(message, ctx);
  if (local) return local;
  return [
    "Cloud chat isn't available right now, but I can still help offline.",
    '',
    'Try asking:',
    '• “Give me an overview”',
    '• “What city am I in?”',
    '• “What’s my IP?”',
    '• “What time does Asda close in Nottingham?”',
    '• “What’s the postcode for Lidl in Beeston?”',
    '• “How are today’s habits?”',
    '',
    'Or tap a suggestion chip below.',
  ].join('\n');
}

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function answerIp(): Promise<string> {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const ipData = (await ipRes.json()) as { ip?: string };
    const ip = ipData.ip;
    if (!ip) throw new Error('no ip');

    let extra = '';
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { Accept: 'application/json' },
      });
      if (geoRes.ok) {
        const geo = (await geoRes.json()) as {
          city?: string;
          region?: string;
          country_name?: string;
          org?: string;
        };
        const place = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ');
        if (place) extra += `\n• Approx. network area: ${place}`;
        if (geo.org) extra += `\n• Network: ${geo.org}`;
      }
    } catch {
      /* optional */
    }

    return `Public IP\n• ${ip}${extra}\n\nThat’s your public network address — not GPS.`;
  } catch {
    return "I couldn't reach an IP lookup service just now. Check you're online and try again.";
  }
}

async function answerLocation(q: string): Promise<string> {
  const wantCoords = /\b(coord|lat|long|gps|exact)\b/.test(q);
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      const ipCity = await cityFromIp();
      if (ipCity) {
        return `Location permission is off, so this is from your network:\n• ${ipCity}\n\nEnable location for Ei for a more precise answer.`;
      }
      return 'I need location permission to answer that. You can enable it in Settings, or ask “what’s my IP?” for a network-based clue.';
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const { latitude, longitude } = pos.coords;

    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const p = places[0];
    const city = p?.city || p?.subregion || p?.district || null;
    const region = p?.region || null;
    const country = p?.country || null;
    const street = [p?.streetNumber, p?.street].filter(Boolean).join(' ') || null;
    const postcode = p?.postalCode || null;

    const lines = ['Location'];
    if (street) lines.push(`• Street: ${street}`);
    if (city) lines.push(`• City: ${city}`);
    if (region) lines.push(`• Area: ${region}`);
    if (postcode) lines.push(`• Postcode: ${postcode}`);
    if (country) lines.push(`• Country: ${country}`);
    if (wantCoords || !city) {
      lines.push(`• Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    }
    if (!city && !street) {
      lines.push("• I couldn't resolve a place name from GPS.");
    }
    return lines.join('\n');
  } catch {
    const ipCity = await cityFromIp();
    if (ipCity) {
      return `GPS failed, so here's your network area instead:\n• ${ipCity}`;
    }
    return "I couldn't read your location. Check permissions and try again.";
  }
}

async function cityFromIp(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const geo = (await res.json()) as {
      city?: string;
      region?: string;
      country_name?: string;
    };
    const place = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ');
    return place || null;
  } catch {
    return null;
  }
}

type PlaceIntent = 'hours' | 'address' | 'both';

type PlaceQuery = {
  business: string;
  /** Explicit town/city from the question, e.g. Nottingham */
  locality: string | null;
  intent: PlaceIntent;
};

type NominatimHit = {
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  osm_type?: string;
  osm_id?: number;
  class?: string;
  type?: string;
  extratags?: Record<string, string>;
  address?: Record<string, string>;
};

const LOCALITY_ALIASES: Record<string, string> = {
  notts: 'nottingham',
  'nottinghamshire': 'nottingham',
  manc: 'manchester',
  brum: 'birmingham',
  'newcastle': 'newcastle upon tyne',
  gla: 'glasgow',
  edi: 'edinburgh',
  liv: 'liverpool',
  sheff: 'sheffield',
  leics: 'leicester',
  derbs: 'derby',
};

/**
 * Parse store questions for any business (Asda, Lidl, corner shop, etc.):
 * hours, address, or postcode — keeping the town after “close” / “for”.
 */
function parsePlaceQuery(original: string): PlaceQuery | null {
  const text = original.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  const wantsHours = /\b(close|open|shut|opening hours|what time|hours)\b/i.test(text);
  const wantsAddress =
    /\b(post\s*code|postcode|address|where is|where's|located|location of|find)\b/i.test(text) ||
    /\bwhat'?s\s+the\s+(address|post\s*code|postcode)\b/i.test(text);

  if (!wantsHours && !wantsAddress) return null;

  const intent: PlaceIntent =
    wantsHours && wantsAddress ? 'both' : wantsAddress ? 'address' : 'hours';

  // what’s the postcode/address for <business> in <locality>
  const addrFor = text.match(
    /(?:what'?s|what is|whats)?\s*(?:the\s+)?(?:post\s*code|postcode|address)\s+(?:for|of)\s+(.+?)(?:\s+(?:in|near|at|around|by)\s+(.+))?$/i
  );
  if (addrFor?.[1]) {
    return {
      business: cleanPlaceName(addrFor[1]),
      locality: normalizeLocality(addrFor[2] ? cleanLocality(addrFor[2]) : extractTrailingLocality(text)),
      intent: 'address',
    };
  }

  // where is / find <business> in <locality>
  const whereIs = text.match(
    /(?:where(?:'?s| is)|find|locate)\s+(.+?)(?:\s+(?:in|near|at|around|by)\s+(.+))?$/i
  );
  if (whereIs?.[1] && wantsAddress) {
    return {
      business: cleanPlaceName(whereIs[1]),
      locality: normalizeLocality(whereIs[2] ? cleanLocality(whereIs[2]) : extractTrailingLocality(text)),
      intent: 'address',
    };
  }

  // what time / when does <business> close|open [in|near|at <locality>]
  const closeMatch = text.match(
    /(?:what time|when)\s+does\s+(.+?)\s+(?:close|open|shut)(?:\s+(?:in|near|at|around|by)\s+(.+?))?(?:\s*[?!.]*)?$/i
  );
  if (closeMatch?.[1]) {
    return {
      business: cleanPlaceName(closeMatch[1]),
      locality: normalizeLocality(
        closeMatch[2] ? cleanLocality(closeMatch[2]) : extractTrailingLocality(text)
      ),
      intent: wantsAddress ? 'both' : 'hours',
    };
  }

  // opening hours for <business> in <locality>
  const hoursMatch = text.match(
    /(?:opening\s+hours(?:\s+for)?|hours\s+for)\s+(.+?)(?:\s+(?:in|near|at|around)\s+(.+))?$/i
  );
  if (hoursMatch?.[1]) {
    return {
      business: cleanPlaceName(hoursMatch[1]),
      locality: normalizeLocality(
        hoursMatch[2] ? cleanLocality(hoursMatch[2]) : extractTrailingLocality(text)
      ),
      intent: 'hours',
    };
  }

  // generic: strip scaffolding, keep business + locality
  if (wantsHours || wantsAddress) {
    const locality = normalizeLocality(extractTrailingLocality(text));
    const stripped = text
      .replace(/what'?s|what is|whats/gi, '')
      .replace(/the\s+(post\s*code|postcode|address)/gi, '')
      .replace(/\b(for|of|where(?:'?s| is)|find|locate)\b/gi, ' ')
      .replace(/what time does/i, '')
      .replace(/when does/i, '')
      .replace(/opening hours( for)?/i, '')
      .replace(/hours for/i, '')
      .replace(/\b(close|open|shut|today|tonight|please|\?)/gi, '')
      .replace(/\b(in|near|at|around|by)\s+[^,]+$/i, '')
      .trim();
    const business = cleanPlaceName(stripped);
    if (business.length >= 2 && business.length < 80) {
      return { business, locality, intent };
    }
  }

  // Heuristic: known supermarket names alone with a town
  if (
    /\b(asda|tesco|aldi|lidl|sainsbury'?s?|morrisons|home bargains|iceland|co-?op|waitrose|marks?\s*&?\s*spencer|m&s|poundland|b&m|wilko|boots|superdrug)\b/i.test(
      lower
    )
  ) {
    const locality = normalizeLocality(extractTrailingLocality(text));
    const brand = text.match(
      /\b(asda|tesco|aldi|lidl|sainsbury'?s?|morrisons|home bargains|iceland|co-?op|waitrose|marks?\s*&?\s*spencer|m&s|poundland|b&m|wilko|boots|superdrug)\b/i
    )?.[1];
    if (brand) {
      return {
        business: brand,
        locality,
        intent: wantsHours ? 'hours' : 'address',
      };
    }
  }

  return null;
}

function extractTrailingLocality(text: string): string | null {
  const m = text.match(/\b(?:in|near|at|around|by)\s+([A-Za-z][A-Za-z\s\-']{1,40})$/i);
  if (!m?.[1]) return null;
  return cleanLocality(m[1]);
}

function cleanPlaceName(raw: string): string {
  return raw
    .replace(/[?!.]+$/g, '')
    .replace(/^(the)\s+/i, '')
    .replace(/\b(in|near|at|around|by)\s+[A-Za-z].*$/i, '')
    .replace(/\b(post\s*code|postcode|address)\b/gi, '')
    .trim();
}

function cleanLocality(raw: string): string {
  return raw
    .replace(/[?!.]+$/g, '')
    .replace(/\b(today|tonight|please|thanks|thank you)\b/gi, '')
    .trim();
}

function normalizeLocality(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return LOCALITY_ALIASES[key] ?? raw.trim();
}

async function nominatimSearch(query: string, opts?: { viewbox?: string; bounded?: boolean }) {
  let url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&limit=8` +
    `&countrycodes=gb&q=${encodeURIComponent(query)}`;
  if (opts?.viewbox) {
    url += `&viewbox=${opts.viewbox}`;
    if (opts.bounded) url += `&bounded=1`;
  }
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': NOMINATIM_UA },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return (await res.json()) as NominatimHit[];
}

async function geocodeLocality(locality: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const hits = await nominatimSearch(`${locality}, United Kingdom`);
    const hit = hits.find((h) => h.lat && h.lon) ?? hits[0];
    if (!hit?.lat || !hit?.lon) return null;
    return { lat: Number(hit.lat), lon: Number(hit.lon) };
  } catch {
    return null;
  }
}

function viewboxAround(lat: number, lon: number, delta = 0.18): string {
  // left, top, right, bottom
  return `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
}

function addressBlob(hit: NominatimHit): string {
  return [
    hit.display_name,
    hit.address?.city,
    hit.address?.town,
    hit.address?.village,
    hit.address?.suburb,
    hit.address?.county,
    hit.address?.state_district,
    hit.address?.municipality,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function localityMatches(hit: NominatimHit, locality: string): boolean {
  const needle = locality.toLowerCase();
  const blob = addressBlob(hit);
  if (blob.includes(needle)) return true;
  if (needle === 'nottingham' && /nottingham/.test(blob)) return true;
  return false;
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function fetchOpeningHours(hit: NominatimHit): Promise<string | null> {
  if (hit.extratags?.opening_hours) return hit.extratags.opening_hours;
  if (!hit.osm_type || !hit.osm_id) return null;

  const type = hit.osm_type === 'relation' ? 'rel' : hit.osm_type;
  const query = `[out:json][timeout:8];${type}(${hit.osm_id});out tags;`;
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const base of mirrors) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(`${base}?data=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json', 'User-Agent': NOMINATIM_UA },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        elements?: Array<{ tags?: Record<string, string> }>;
      };
      const hours = data.elements?.[0]?.tags?.opening_hours;
      if (hours) return hours;
    } catch {
      /* try next mirror */
    }
  }
  return null;
}

function formatStreetLine(hit: NominatimHit): string {
  const a = hit.address ?? {};
  const street = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(' ');
  const area = a.suburb || a.neighbourhood || a.quarter;
  const town = a.city || a.town || a.village || a.municipality;
  return [street, area, town].filter(Boolean).join(', ');
}

function formatPostcode(hit: NominatimHit): string | null {
  return hit.address?.postcode?.trim() || null;
}

function formatHitBlock(
  hit: NominatimHit,
  business: string,
  index: number,
  intent: PlaceIntent,
  hours: string | null
): string {
  const label = hit.name || business;
  const street = formatStreetLine(hit);
  const postcode = formatPostcode(hit);
  const lines: string[] = [];

  lines.push(index === 0 ? label : `${index + 1}. ${label}`);

  if (street) lines.push(`• Address: ${street}`);
  if (postcode) lines.push(`• Postcode: ${postcode}`);
  if (!street && hit.display_name) {
    lines.push(`• Place: ${hit.display_name.split(',').slice(0, 4).join(',').trim()}`);
  }

  if (intent === 'hours' || intent === 'both') {
    if (hours) {
      lines.push(`• Today: ${summariseOpeningHours(hours)}`);
      lines.push(`• Hours: ${hours}`);
    } else if (index === 0) {
      lines.push('• Hours: not listed on OpenStreetMap');
    }
  }

  return lines.join('\n');
}

async function searchPlaces(
  business: string,
  locality: string | null
): Promise<NominatimHit[]> {
  let results: NominatimHit[] = [];
  let anchor: { lat: number; lon: number } | null = null;

  if (locality) {
    anchor = await geocodeLocality(locality);
    results = await nominatimSearch(`${business} ${locality}`, {
      viewbox: anchor ? viewboxAround(anchor.lat, anchor.lon, 0.22) : undefined,
      bounded: false,
    });
    const matched = results.filter((r) => localityMatches(r, locality));
    if (matched.length) results = matched;
    else {
      results = await nominatimSearch(`${business}, ${locality}, UK`);
      const matched2 = results.filter((r) => localityMatches(r, locality));
      if (matched2.length) results = matched2;
    }
  } else {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        anchor = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        results = await nominatimSearch(`${business} UK`, {
          viewbox: viewboxAround(anchor.lat, anchor.lon, 0.35),
          bounded: false,
        });
      }
    } catch {
      /* fall through */
    }
    if (!results.length) {
      results = await nominatimSearch(`${business} UK`);
    }
  }

  const ranked = [...results].sort((a, b) => {
    if (locality) {
      const am = localityMatches(a, locality) ? 0 : 1;
      const bm = localityMatches(b, locality) ? 0 : 1;
      if (am !== bm) return am - bm;
    }
    const shopScore = (h: NominatimHit) =>
      h.class === 'shop' || h.type === 'supermarket' || h.type === 'convenience' ? 0 : 1;
    const ss = shopScore(a) - shopScore(b);
    if (ss !== 0) return ss;
    if (anchor && a.lat && a.lon && b.lat && b.lon) {
      return (
        haversineKm(anchor.lat, anchor.lon, Number(a.lat), Number(a.lon)) -
        haversineKm(anchor.lat, anchor.lon, Number(b.lat), Number(b.lon))
      );
    }
    return 0;
  });

  const filtered = locality ? ranked.filter((r) => localityMatches(r, locality)) : ranked;
  return filtered.length ? filtered : ranked;
}

async function answerPlaceLookup(query: PlaceQuery): Promise<string> {
  const { business, locality, intent } = query;
  if (!business) {
    return [
      'Tell me the shop and town.',
      '',
      'Examples:',
      '• What time does Asda close in Nottingham?',
      '• What’s the postcode for Lidl in Beeston?',
      '• Where is the Co-op near Hucknall?',
    ].join('\n');
  }

  try {
    const results = await searchPlaces(business, locality);

    if (!results.length) {
      return locality
        ? `I couldn't find ${business} in ${locality}.\n\nTry another spelling, a suburb, or a postcode area.`
        : `I couldn't find “${business}”.\n\nAdd a town — e.g. “${business} in Nottingham”.`;
    }

    if (locality && !results.some((r) => localityMatches(r, locality))) {
      const wrong = results[0]!;
      return [
        `I couldn't confidently match ${business} in ${locality}.`,
        '',
        'Closest map hit:',
        `• ${formatStreetLine(wrong) || wrong.display_name || 'unknown'}`,
        '',
        `Try a more specific area, e.g. “${business} in ${locality} city centre”.`,
      ].join('\n');
    }

    const top = results.slice(0, 5);
    const needHours = intent === 'hours' || intent === 'both';
    const primaryHours = needHours ? await fetchOpeningHours(top[0]!) : null;

    const title =
      intent === 'hours'
        ? `${business} hours${locality ? ` · ${locality}` : ''}`
        : `${business}${locality ? ` · ${locality}` : ''}`;

    const blocks: string[] = [title, ''];

    for (let i = 0; i < top.length; i++) {
      const hit = top[i]!;
      const hours = i === 0 ? primaryHours : null;
      blocks.push(formatHitBlock(hit, business, i, intent, hours));
      if (i < top.length - 1) blocks.push('');
    }

    if (top.length > 1) {
      blocks.push('');
      blocks.push(`${top.length} branches shown.`);
    }

    return blocks.join('\n');
  } catch {
    return `I couldn't look up “${business}”${locality ? ` in ${locality}` : ''} right now.\n\nCheck you're online and try again.`;
  }
}

/** Best-effort OSM opening_hours → today's window. */
function summariseOpeningHours(raw: string): string {
  const dayIdx = new Date().getDay(); // 0 Sun
  const dayKeys = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const today = dayKeys[dayIdx]!;

  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?/.test(part) === false) {
      continue;
    }
    const [days, ...rest] = part.split(/\s+/);
    const times = rest.join(' ');
    if (!days || !times) continue;
    if (dayInRange(today, days)) {
      if (/off/i.test(times)) return 'Closed';
      return times.replace(/-/g, '–');
    }
  }

  if (/24\/7/i.test(raw)) return 'Open 24 hours';
  return 'See listed hours below';
}

function dayInRange(today: string, days: string): boolean {
  const order = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  if (days.includes('-')) {
    const [a, b] = days.split('-');
    const i = order.indexOf(a!);
    const j = order.indexOf(b!);
    const t = order.indexOf(today);
    if (i < 0 || j < 0 || t < 0) return false;
    if (i <= j) return t >= i && t <= j;
    return t >= i || t <= j;
  }
  return days.split(',').map((d) => d.trim()).includes(today);
}

/** Detect cloud / network chat failures so we can fall back offline. */
export function isCloudChatFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /openai|gemini|quota|billing|OPENAI|GEMINI|502|503|429|required for Ei|chat request failed|Chat failed|Session expired|Failed to fetch|Network request failed|not available/i.test(
    msg
  );
}
