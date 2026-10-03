/** Browser-only Wave 2 local lab helpers. */

export type RegexLabResult = {
  ok: boolean;
  error?: string;
  matches: { index: number; text: string; groups: string[] }[];
};

export function runRegex(pattern: string, flags: string, input: string): RegexLabResult {
  try {
    const re = new RegExp(pattern, flags);
    const matches: RegexLabResult['matches'] = [];
    if (flags.includes('g')) {
      let m: RegExpExecArray | null;
      const clone = new RegExp(pattern, flags);
      while ((m = clone.exec(input)) !== null) {
        matches.push({
          index: m.index,
          text: m[0],
          groups: m.slice(1),
        });
        if (m[0].length === 0) clone.lastIndex++;
      }
    } else {
      const m = re.exec(input);
      if (m) matches.push({ index: m.index, text: m[0], groups: m.slice(1) });
    }
    return { ok: true, matches };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid regex', matches: [] };
  }
}

export type CodePointRow = {
  char: string;
  codePoint: string;
  hex: string;
  category: string;
};

export function inspectUnicode(input: string): CodePointRow[] {
  const rows: CodePointRow[] = [];
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    rows.push({
      char: ch === ' ' ? '␠' : ch === '\n' ? '\\n' : ch === '\t' ? '\\t' : ch,
      codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
      hex: cp.toString(16).toUpperCase(),
      category: /\p{L}/u.test(ch)
        ? 'Letter'
        : /\p{N}/u.test(ch)
          ? 'Number'
          : /\p{P}/u.test(ch)
            ? 'Punctuation'
            : /\p{Z}/u.test(ch)
              ? 'Separator'
              : 'Other',
    });
  }
  return rows.slice(0, 500);
}

export function looksLikeHomoglyphPair(a: string, b: string): boolean {
  return a.normalize('NFKC') === b.normalize('NFKC') && a !== b;
}

export type PemDecodeResult = {
  ok: boolean;
  error?: string;
  type?: string;
  fields?: Record<string, string>;
  rawLength?: number;
};

export function decodePem(pem: string): PemDecodeResult {
  const match = pem.match(/-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) {
    return { ok: false, error: 'No PEM block found (BEGIN/END).' };
  }
  const type = match[1].trim();
  const b64 = match[2].replace(/\s+/g, '');
  try {
    const binary = atob(b64);
    const fields: Record<string, string> = {
      type,
      der_bytes: String(binary.length),
      note:
        type.includes('CERTIFICATE') || type.includes('REQUEST')
          ? 'Parsed PEM framing only in-browser. Full ASN.1 field extraction is limited without a crypto ASN.1 library.'
          : 'PEM framing decoded.',
    };
    // Lightweight heuristic strings sometimes embedded as printable UTF-8 in DER
    const printable = binary.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length > 8) fields.printable_ascii_hint = printable.slice(0, 300);
    return { ok: true, type, fields, rawLength: binary.length };
  } catch {
    return { ok: false, error: 'Invalid base64 in PEM body.' };
  }
}

export type SecretHit = {
  label: string;
  match: string;
  index: number;
};

const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'AWS Access Key ID', re: /AKIA[0-9A-Z]{16}/g },
  { label: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{20,}/g },
  { label: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { label: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/g },
  { label: 'JWT-like', re: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  { label: 'Private key header', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  {
    label: 'High-entropy quote',
    re: /['"]([A-Za-z0-9+\/=_-]{32,})['"]/g,
  },
];

export function scanSecrets(text: string): SecretHit[] {
  const hits: SecretHit[] = [];
  for (const { label, re } of SECRET_PATTERNS) {
    const clone = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = clone.exec(text)) !== null) {
      hits.push({
        label,
        match: m[0].length > 80 ? `${m[0].slice(0, 80)}…` : m[0],
        index: m.index,
      });
      if (hits.length >= 100) return hits;
    }
  }
  return hits;
}

export type TimestampResult = {
  input: string;
  asDateUtc?: string;
  asUnixSeconds?: number;
  asUnixMillis?: number;
  error?: string;
};

export function interpretTimestamp(input: string): TimestampResult {
  const trimmed = input.trim();
  if (!trimmed) return { input, error: 'Enter a unix timestamp or ISO date.' };
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    const ms = trimmed.length >= 13 ? n : n * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return { input, error: 'Invalid numeric timestamp.' };
    return {
      input,
      asDateUtc: d.toISOString(),
      asUnixSeconds: Math.floor(ms / 1000),
      asUnixMillis: ms,
    };
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return { input, error: 'Could not parse date string.' };
  return {
    input,
    asDateUtc: d.toISOString(),
    asUnixSeconds: Math.floor(d.getTime() / 1000),
    asUnixMillis: d.getTime(),
  };
}
