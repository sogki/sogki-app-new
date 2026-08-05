import { Linking } from 'react-native';

export type QrRiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type QrAnalysis = {
  raw: string;
  kind: 'url' | 'text' | 'wifi' | 'mailto' | 'tel' | 'sms' | 'other';
  destination: string;
  host: string | null;
  openUrl: string | null;
  officialHints: string[];
  risk: QrRiskLevel;
  riskReasons: string[];
  summary: string;
};

/**
 * Brand recognizer: hostname / full URL substring matches for common consumer + tech brands.
 * Packaging QR codes often land on brand.com, brand.co.uk, win.brand…, or parent-company domains.
 */
const BRANDS: Array<{ label: string; patterns: RegExp[] }> = [
  // Confectionery / gum / snacks
  {
    label: 'Extra (Mars Wrigley)',
    patterns: [/extragum/i, /(^|\.)extra\.(com|co\.uk|com\.au|ca|de|fr|es|it)(\.|$)/i],
  },
  {
    label: 'Mars Wrigley',
    patterns: [
      /wrigley/i,
      /(^|\.)mars\.(com|co\.uk|com\.au)(\.|$)/i,
      /marswrigley/i,
      /wrigleypromotions/i,
    ],
  },
  { label: 'Orbit gum', patterns: [/orbitgum/i, /(^|\.)orbit\./i] },
  { label: 'Extra / Freedent', patterns: [/freedent/i] },
  { label: 'Mentos', patterns: [/mentos/i] },
  { label: 'Hubba Bubba', patterns: [/hubbabubba/i] },
  { label: 'Skittles', patterns: [/skittles/i] },
  { label: 'M&M’s', patterns: [/mms\.com/i, /m-ms/i, /mandms/i] },
  { label: 'Snickers', patterns: [/snickers/i] },
  { label: 'Twix', patterns: [/twix/i] },
  { label: 'KitKat', patterns: [/kitkat/i] },
  { label: 'Cadbury', patterns: [/cadbury/i] },
  { label: 'Haribo', patterns: [/haribo/i] },
  { label: 'Nestlé', patterns: [/nestle/i, /nesquik/i, /kitkat/i] },
  { label: 'Ferrero', patterns: [/ferrero/i, /nutella/i, /kinder/i, /tic.?tac/i] },
  { label: 'Mondelez', patterns: [/mondelez/i, /oreo/i, /milka/i, /toblerone/i] },
  { label: 'PepsiCo', patterns: [/pepsico/i, /pepsi/i, /walkers/i, /doritos/i, /lays/i, /quaker/i] },
  { label: 'Coca-Cola', patterns: [/coca-?cola/i, /coke\.com/i, /sprite/i, /fanta/i] },
  { label: 'Red Bull', patterns: [/redbull/i] },
  { label: 'Unilever', patterns: [/unilever/i, /hellmanns/i, /benjerry/i, /magnum/i] },
  { label: 'P&G', patterns: [/pg\.com/i, /gillette/i, /oralb/i, /pampers/i] },
  { label: 'Colgate', patterns: [/colgate/i] },
  { label: 'L’Oréal', patterns: [/loreal/i] },
  { label: 'Nivea', patterns: [/nivea/i] },
  // Retail / grocery
  { label: 'Tesco', patterns: [/tesco/i] },
  { label: 'Sainsbury’s', patterns: [/sainsbury/i] },
  { label: 'Asda', patterns: [/asda/i] },
  { label: 'Waitrose', patterns: [/waitrose/i] },
  { label: 'Aldi', patterns: [/aldi/i] },
  { label: 'Lidl', patterns: [/lidl/i] },
  { label: 'Amazon', patterns: [/(^|\.)amazon\./i, /amzn\./i] },
  // Tech / platforms
  { label: 'Apple', patterns: [/(^|\.)apple\.com$/i, /(^|\.)icloud\.com$/i] },
  { label: 'Google', patterns: [/(^|\.)google\./i, /(^|\.)youtube\.com$/i, /(^|\.)youtu\.be$/i, /(^|\.)goo\.gl$/i] },
  { label: 'Microsoft', patterns: [/(^|\.)microsoft\.com$/i, /(^|\.)office\.com$/i, /(^|\.)live\.com$/i] },
  { label: 'Meta', patterns: [/(^|\.)facebook\.com$/i, /(^|\.)instagram\.com$/i, /(^|\.)whatsapp\.com$/i, /(^|\.)meta\.com$/i] },
  { label: 'X / Twitter', patterns: [/(^|\.)twitter\.com$/i, /(^|\.)x\.com$/i] },
  { label: 'TikTok', patterns: [/tiktok/i] },
  { label: 'Discord', patterns: [/(^|\.)discord\.com$/i, /(^|\.)discord\.gg$/i] },
  { label: 'Spotify', patterns: [/spotify/i] },
  { label: 'PayPal', patterns: [/(^|\.)paypal\.com$/i] },
  { label: 'GitHub', patterns: [/(^|\.)github\.com$/i] },
  { label: 'LinkedIn', patterns: [/(^|\.)linkedin\.com$/i] },
  { label: 'Wikipedia', patterns: [/(^|\.)wikipedia\.org$/i] },
  // Public / UK
  { label: 'UK Government', patterns: [/(^|\.)gov\.uk$/i] },
  { label: 'NHS', patterns: [/(^|\.)nhs\.uk$/i] },
  { label: 'Sogki', patterns: [/(^|\.)sogki\.dev$/i] },
];

/** Phishing-style wording — require path/query (or whole host) signals, not just “secure.” subdomains. */
const PHISH_WORDS =
  /(login|signin|sign-in|verify-account|account-update|wallet|crypto|airdrop|free-gift|support-desk|password-reset)/i;

const IP_HOST = /^\d{1,3}(\.\d{1,3}){3}$/;

const SHORTENERS =
  /^(bit\.ly|tinyurl\.com|t\.co|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rebrand\.ly|rb\.gy|shorturl\.at)$/i;

/** Common marketing / deep-link wrappers used on packaging (not inherently malicious). */
const CAMPAIGN_HOSTS =
  /(onelink\.me|app\.link|page\.link|qrco\.de|qr-code|qrs\.ly|goqr|branch\.io|appsflyer|adjust\.com|bitly\.com)$/i;

function tryParseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  try {
    return new URL(trimmed);
  } catch {
    try {
      if (/^[\w.-]+\.[a-z]{2,}([/:?].*)?$/i.test(trimmed)) {
        return new URL(`https://${trimmed}`);
      }
    } catch {
      return null;
    }
  }
  return null;
}

function matchBrands(host: string, href: string): string[] {
  const hay = `${host} ${href}`;
  const found: string[] = [];
  for (const brand of BRANDS) {
    if (brand.patterns.some((p) => p.test(host) || p.test(hay))) {
      if (!found.includes(brand.label)) found.push(brand.label);
    }
  }
  return found;
}

function bumpRisk(current: QrRiskLevel, next: QrRiskLevel): QrRiskLevel {
  const order: QrRiskLevel[] = ['low', 'unknown', 'medium', 'high'];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

export function analyseQrPayload(rawInput: string): QrAnalysis {
  const raw = rawInput.trim();
  const lower = raw.toLowerCase();
  const riskReasons: string[] = [];
  let risk: QrRiskLevel = 'low';
  let kind: QrAnalysis['kind'] = 'text';
  let destination = raw;
  let host: string | null = null;
  let openUrl: string | null = null;
  let officialHints: string[] = [];

  if (lower.startsWith('wifi:')) {
    kind = 'wifi';
    destination = 'Wi‑Fi network credentials (not a website link)';
    risk = 'medium';
    riskReasons.push('Wi‑Fi QR codes can connect you to an attacker-controlled network.');
  } else if (lower.startsWith('mailto:')) {
    kind = 'mailto';
    destination = raw.slice(7);
    openUrl = raw;
  } else if (lower.startsWith('tel:')) {
    kind = 'tel';
    destination = raw.slice(4);
    openUrl = raw;
  } else if (lower.startsWith('sms:')) {
    kind = 'sms';
    destination = raw.slice(4);
    openUrl = raw;
  } else {
    const url = tryParseUrl(raw);
    if (url) {
      kind = 'url';
      host = url.hostname.replace(/^www\./i, '');
      destination = url.href;
      openUrl = url.href;
      officialHints = matchBrands(host, url.href);

      if (url.protocol === 'http:') {
        risk = bumpRisk(risk, 'medium');
        riskReasons.push('Uses insecure HTTP (not HTTPS).');
      }
      if (IP_HOST.test(url.hostname)) {
        risk = bumpRisk(risk, 'high');
        riskReasons.push('Points at a raw IP address instead of a normal domain.');
      }
      if (SHORTENERS.test(host)) {
        risk = bumpRisk(risk, 'medium');
        riskReasons.push('Uses a URL shortener — the final destination is hidden until you open it.');
      }
      if (CAMPAIGN_HOSTS.test(host) && officialHints.length === 0) {
        // Tracking wrappers are common on packs; note them, don't scare.
        riskReasons.push(
          'Looks like a campaign / tracking link (common on packaging). Destination is fine if you trust the product.'
        );
      }
      if (PHISH_WORDS.test(host) || PHISH_WORDS.test(url.pathname + url.search)) {
        // Brand promo sites with "secure." subdomains should not auto-flag.
        if (officialHints.length === 0) {
          risk = bumpRisk(risk, 'high');
          riskReasons.push(
            'Host or path uses login/verify/wallet-style wording often seen in phishing.'
          );
        } else {
          riskReasons.push(
            'Contains account-style wording, but the domain matches a known brand — still only enter details if you expect to.'
          );
        }
      }
      if (url.username || url.password) {
        risk = bumpRisk(risk, 'high');
        riskReasons.push('URL embeds credentials (unusual for legitimate sites).');
      }
      if ((url.href.match(/@/g) ?? []).length > 0 && !url.username) {
        risk = bumpRisk(risk, 'high');
        riskReasons.push('Contains @ in a way that can spoof trusted domains.');
      }

      // Lookalike of payment/tech brands only when not actually matched.
      if (
        officialHints.length === 0 &&
        /(paypal|appleid|microsoft|google|amazon|nhs|gov\.uk)/i.test(host) &&
        !/(^|\.)(paypal|apple|microsoft|google|amazon|nhs\.uk|gov\.uk)/i.test(host)
      ) {
        risk = bumpRisk(risk, 'high');
        riskReasons.push('Domain looks like a brand lookalike.');
      }

      if (officialHints.length === 0 && risk === 'low') {
        // Informational only — unknown ≠ unsafe.
        riskReasons.push(
          'Domain isn’t in Ei’s brand recognizer. That doesn’t mean it’s fake — many real pack QR codes use campaign sites.'
        );
      }
    } else {
      kind = 'other';
      destination = raw;
      risk = 'unknown';
      riskReasons.push('Not a standard web link — inspect the raw payload carefully.');
    }
  }

  if (riskReasons.length === 0 && kind === 'url') {
    riskReasons.push('No structural red flags. Still only open links you expect from the packaging.');
  }

  const summary =
    kind === 'url'
      ? officialHints.length
        ? `Opens ${host ?? 'a website'} · likely ${officialHints[0]}${officialHints.length > 1 ? ` (+${officialHints.length - 1})` : ''}`
        : `Opens ${host ?? 'a website'}`
      : kind === 'wifi'
        ? 'Encodes Wi‑Fi join details'
        : kind === 'mailto'
          ? `Email address: ${destination}`
          : kind === 'tel'
            ? `Phone number: ${destination}`
            : 'Custom / non-link payload';

  return {
    raw,
    kind,
    destination,
    host,
    openUrl,
    officialHints,
    risk,
    riskReasons,
    summary,
  };
}

export async function openQrDestination(analysis: QrAnalysis): Promise<void> {
  if (!analysis.openUrl) throw new Error('This QR has no openable link');
  const can = await Linking.canOpenURL(analysis.openUrl);
  if (!can) throw new Error('Cannot open this link on this device');
  await Linking.openURL(analysis.openUrl);
}

export function riskLabel(risk: QrRiskLevel): string {
  switch (risk) {
    case 'low':
      return 'Looks okay';
    case 'medium':
      return 'Caution';
    case 'high':
      return 'Suspicious';
    default:
      return 'Unknown';
  }
}
