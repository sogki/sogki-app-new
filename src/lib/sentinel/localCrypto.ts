/** Browser-only crypto/utility helpers — never send secrets to the API. */

const textEncoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashText(
  algorithm: 'SHA-256' | 'SHA-1',
  input: string
): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, textEncoder.encode(input));
  return toHex(digest);
}

/** MD5 is legacy — implemented for lab comparison only, not security. */
export async function md5Hex(input: string): Promise<string> {
  // SubtleCrypto has no MD5; use a tiny pure implementation.
  return md5(input);
}

export function base64Encode(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

export function base64Decode(input: string): string {
  return decodeURIComponent(escape(atob(input)));
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input);
}

export type JwtDecodeResult = {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  warnings: string[];
  verified: boolean | null;
  error?: string;
};

function b64urlToJson(part: string): Record<string, unknown> {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4);
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

export async function decodeJwt(token: string, secret?: string): Promise<JwtDecodeResult> {
  const warnings: string[] = [];
  const parts = token.trim().split('.');
  if (parts.length < 2) {
    return {
      header: null,
      payload: null,
      signature: '',
      warnings,
      verified: null,
      error: 'Not a JWT (expected header.payload.signature)',
    };
  }

  let header: Record<string, unknown> | null = null;
  let payload: Record<string, unknown> | null = null;
  try {
    header = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch {
    return {
      header: null,
      payload: null,
      signature: parts[2] || '',
      warnings,
      verified: null,
      error: 'Failed to decode JWT segments',
    };
  }

  const alg = String(header.alg || '');
  if (alg.toLowerCase() === 'none') warnings.push('alg is "none" — signature is not enforced.');
  if (payload.exp == null) warnings.push('Missing exp claim — token has no expiry.');
  else {
    const exp = Number(payload.exp);
    if (!Number.isNaN(exp) && exp * 1000 < Date.now()) warnings.push('Token is expired.');
  }
  if (payload.nbf != null && Number(payload.nbf) * 1000 > Date.now()) {
    warnings.push('Token nbf is in the future.');
  }

  let verified: boolean | null = null;
  if (secret && parts.length === 3 && alg === 'HS256') {
    verified = await verifyHs256(parts[0], parts[1], parts[2], secret);
    if (!verified) warnings.push('HS256 signature verification failed.');
  } else if (secret && alg !== 'HS256') {
    warnings.push(`Signature verify skipped — only HS256 is supported locally (alg=${alg || 'unknown'}).`);
  }

  return {
    header,
    payload,
    signature: parts[2] || '',
    warnings,
    verified,
  };
}

async function verifyHs256(
  header: string,
  payload: string,
  signatureB64url: string,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = textEncoder.encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const expected = bufferToB64url(sig);
  return expected === signatureB64url;
}

function bufferToB64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export type PasswordStrengthResult = {
  score: number;
  label: string;
  tips: string[];
};

const COMMON = [
  'password',
  '123456',
  'qwerty',
  'letmein',
  'admin',
  'welcome',
  'iloveyou',
  'monkey',
  'dragon',
  'master',
];

export function scorePassword(password: string): PasswordStrengthResult {
  const tips: string[] = [];
  let score = 0;
  const length = password.length;

  if (!length) {
    return { score: 0, label: 'Empty', tips: ['Enter a password to analyse locally.'] };
  }

  if (length >= 8) score += 1;
  else tips.push('Use at least 8 characters (12+ is better).');
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else tips.push('Mix upper and lower case letters.');
  if (/\d/.test(password)) score += 1;
  else tips.push('Add digits.');
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else tips.push('Add symbols.');

  const lower = password.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) {
    score = Math.max(0, score - 2);
    tips.push('Avoid common words and leaked password patterns.');
  }
  if (/^(.)\1+$/.test(password) || 'abcdefghijklmnopqrstuvwxyz'.includes(lower)) {
    score = Math.max(0, score - 1);
    tips.push('Avoid repeated or sequential characters.');
  }

  score = Math.max(0, Math.min(5, score));
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  if (score >= 4 && tips.length === 0) tips.push('Looks reasonable — prefer a password manager.');
  return { score, label: labels[score], tips };
}

/* Minimal MD5 — lab use only */
function md5(str: string): string {
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function md5cycle(x: number[], k: number[]) {
    let [a, b, c, d] = x;
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = (a + x[0]) | 0;
    x[1] = (b + x[1]) | 0;
    x[2] = (c + x[2]) | 0;
    x[3] = (d + x[3]) | 0;
  }
  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  function md51(s: string) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
    s = s.substring(i - 64);
    const tail = new Array(16).fill(0);
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
    tail[i >> 2] |= 0x80 << (i % 4 << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++) s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16);
    return s;
  }
  return md51(unescape(encodeURIComponent(str))).map(rhex).join('');
}
