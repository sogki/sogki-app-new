import type { LifeScan } from './types';
import type { ProductLookup } from './productLookup';
import type { QrAnalysis } from './qrAnalysis';

export type ScanFingerprintInput = {
  mode: LifeScan['mode'];
  barcode?: string | null;
  qrRaw?: string | null;
  qrDestination?: string | null;
  title?: string | null;
  text?: string | null;
};

export type ScanMemoryHit = {
  scan: LifeScan;
  fingerprint: string;
  agoLabel: string;
  timesSeen: number;
};

/** Natural “how long ago” for memory copy. */
export function relativeAgoLong(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'recently';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function normalizeDigits(code: string): string {
  return code.replace(/\D/g, '');
}

function normalizeQr(raw: string): string {
  return raw.trim().toLowerCase().replace(/\/+$/, '');
}

function normalizeTextKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .slice(0, 160);
}

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function buildScanFingerprint(input: ScanFingerprintInput): string | null {
  if (input.mode === 'barcode' || input.barcode) {
    const digits = normalizeDigits(input.barcode ?? '');
    if (digits.length >= 8) return `barcode:${digits}`;
  }
  if (input.mode === 'qr' || input.qrRaw || input.qrDestination) {
    const key = normalizeQr(input.qrDestination || input.qrRaw || '');
    if (key.length >= 4) return `qr:${key}`;
  }
  const titleKey = normalizeTextKey(input.title ?? '');
  if (titleKey.length >= 8) return `title:${simpleHash(titleKey)}:${titleKey.slice(0, 40)}`;
  const textKey = normalizeTextKey(input.text ?? '');
  if (textKey.length >= 12) return `text:${simpleHash(textKey)}`;
  return null;
}

/** Recover a fingerprint from an older saved scan that may lack one. */
export function fingerprintFromScan(scan: LifeScan): string | null {
  if (scan.fingerprint) return scan.fingerprint;
  const barcodeMatch = scan.text.match(/Barcode\s*[·•:]\s*([0-9\s-]+)/i);
  if (barcodeMatch || scan.mode === 'barcode') {
    return buildScanFingerprint({
      mode: 'barcode',
      barcode: barcodeMatch?.[1] ?? '',
      title: scan.title,
      text: scan.text,
    });
  }
  if (scan.mode === 'qr') {
    const dest =
      scan.text.match(/Destination:\s*(.+)/i)?.[1]?.trim() ||
      scan.text.split('\n').find((l) => /^https?:\/\//i.test(l.trim())) ||
      scan.title.replace(/^QR\s*[·•]\s*/i, '');
    return buildScanFingerprint({
      mode: 'qr',
      qrDestination: dest,
      qrRaw: scan.text,
      title: scan.title,
    });
  }
  return buildScanFingerprint({
    mode: scan.mode ?? 'ocr',
    title: scan.title,
    text: scan.text,
  });
}

export function findScanMemory(
  scans: LifeScan[] | undefined | null,
  fingerprint: string | null
): ScanMemoryHit | null {
  if (!fingerprint || !scans?.length) return null;
  for (const scan of scans) {
    const fp = fingerprintFromScan(scan);
    if (fp && fp === fingerprint) {
      const when = scan.lastSeenAt || scan.createdAt;
      return {
        scan,
        fingerprint,
        agoLabel: relativeAgoLong(when),
        timesSeen: Math.max(1, scan.scanCount ?? 1),
      };
    }
  }
  return null;
}

export function memoryBannerCopy(hit: ScanMemoryHit): string {
  const times = hit.timesSeen;
  if (times <= 1) {
    return `You already have this · scanned ${hit.agoLabel}`;
  }
  return `You've seen this ${times} times · last ${hit.agoLabel}`;
}

export function productCategoryLabel(product: ProductLookup): string {
  if (product.categories) {
    const first = product.categories.split(/[,/>|]/)[0]?.trim();
    if (first) return first;
  }
  switch (product.kind) {
    case 'drink':
      return 'Soft drink';
    case 'food':
      return 'Food';
    case 'beauty':
      return 'Beauty';
    case 'pet':
      return 'Pet';
    case 'medicine':
      return 'Medicine';
    case 'book':
      return 'Book';
    case 'manga':
      return 'Manga';
    case 'toy':
      return 'Toy';
    case 'tcg':
      return 'Trading card';
    default:
      return 'Product';
  }
}

export function productEmoji(product: ProductLookup): string {
  switch (product.kind) {
    case 'drink':
      return '🥤';
    case 'food':
      return '🍽️';
    case 'beauty':
      return '✨';
    case 'pet':
      return '🐾';
    case 'medicine':
      return '💊';
    case 'book':
      return '📚';
    case 'manga':
      return '📖';
    case 'toy':
      return '🧸';
    case 'tcg':
      return '🃏';
    default:
      return '📦';
  }
}

export function productInfoBullets(product: ProductLookup): string[] {
  const bullets: string[] = [];
  if (product.quantity) bullets.push(product.quantity);
  if (product.brand && product.kind !== 'book' && product.kind !== 'manga') {
    bullets.push(`Brand: ${product.brand}`);
  }
  if (product.authors) bullets.push(`Author(s): ${product.authors}`);
  const kcal = product.nutrition.find((n) => /energy|kcal/i.test(n.label));
  if (kcal) {
    const n = parseFloat(kcal.per100g);
    if (Number.isFinite(n) && n === 0) bullets.push('0 calories');
    else if (kcal.per100g) bullets.push(`${kcal.per100g} per 100g`);
  }
  if (product.ingredients) bullets.push('Ingredients available');
  if (product.allergens) bullets.push(`Allergens: ${product.allergens}`);
  if (product.nutriscore) bullets.push(`Nutri-Score ${product.nutriscore}`);
  if (product.activeIngredients) bullets.push(`Active: ${product.activeIngredients}`);
  if (product.description) {
    const short =
      product.description.length > 90
        ? `${product.description.slice(0, 87)}…`
        : product.description;
    if (!bullets.includes(short)) bullets.push(short);
  }
  if (!product.found && product.summary) bullets.push(product.summary);
  if (!bullets.length) bullets.push(`Barcode ${product.barcode}`);
  return bullets.slice(0, 6);
}

export function qrInfoBullets(qr: QrAnalysis): string[] {
  const bullets: string[] = [qr.summary];
  if (qr.officialHints.length) {
    bullets.push(`Recognized: ${qr.officialHints.join(', ')}`);
  } else {
    bullets.push('No brand match — not automatically unsafe');
  }
  for (const reason of qr.riskReasons.slice(0, 2)) {
    bullets.push(reason);
  }
  return bullets.slice(0, 5);
}

export function textInfoBullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5);
}

/** Lightweight scan rows for Ei tools / context (no images). */
export function scansForAi(scans: LifeScan[] | undefined | null, limit = 40) {
  return (scans ?? []).slice(0, limit).map((s) => ({
    id: s.id,
    title: s.title,
    mode: s.mode ?? null,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt ?? s.createdAt,
    scanCount: s.scanCount ?? 1,
    fingerprint: s.fingerprint ?? fingerprintFromScan(s),
    locationLabel: s.locationLabel ?? null,
    textPreview: (s.text ?? '').slice(0, 400),
  }));
}

export function summarizeScansForContext(scans: LifeScan[] | undefined | null, limit = 6): string {
  const list = scans ?? [];
  if (!list.length) return 'Scans: none saved yet.';
  const bits = list.slice(0, limit).map((s) => {
    const when = relativeAgoLong(s.lastSeenAt || s.createdAt);
    return `${s.title} (${s.mode ?? 'scan'}, ${when})`;
  });
  return `Recent scans (${list.length}): ${bits.join('; ')}.`;
}

export function searchScansByQuery(scans: LifeScan[] | undefined | null, query: string): LifeScan[] {
  const q = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  if (!q || !scans?.length) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  if (!tokens.length) return [];

  const scored = scans
    .map((scan) => {
      const hay = `${scan.title}\n${scan.text}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += t.length > 4 ? 2 : 1;
      }
      return { scan, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.scan.createdAt.localeCompare(a.scan.createdAt));

  return scored.slice(0, 5).map((x) => x.scan);
}
