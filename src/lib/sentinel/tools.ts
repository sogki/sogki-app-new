export type ToolCategory = 'web' | 'local' | 'core' | 'learn';

export type SentinelTool = {
  id: string;
  name: string;
  description: string;
  teaches: string;
  category: ToolCategory;
  to: string;
};

export const SENTINEL_TOOLS: SentinelTool[] = [
  {
    id: 'scanner',
    name: 'Web Scanner',
    description: 'Passive full assessment with findings and Sentinel Security Score.',
    teaches: 'How observation-only checks become structured findings.',
    category: 'core',
    to: '/admin/sentinel/scanner',
  },
  {
    id: 'headers',
    name: 'Header Lab',
    description: 'Inspect and annotate HTTP response security headers.',
    teaches: 'What browsers learn from response headers.',
    category: 'web',
    to: '/admin/sentinel/tools/headers',
  },
  {
    id: 'tls',
    name: 'TLS Inspector',
    description: 'Review certificate identity, expiry, SANs, and negotiated version.',
    teaches: 'How TLS trust is established for a hostname.',
    category: 'web',
    to: '/admin/sentinel/tools/tls',
  },
  {
    id: 'redirects',
    name: 'Redirect Mapper',
    description: 'Map redirect hops, status codes, and final landing URL.',
    teaches: 'How redirect chains affect cookies, HSTS, and canonical hosts.',
    category: 'web',
    to: '/admin/sentinel/tools/redirects',
  },
  {
    id: 'disclosure',
    name: 'Disclosure Analyzer',
    description: 'Inspect robots.txt, security.txt, and sitemap.xml metadata.',
    teaches: 'What public files intentionally expose about a site.',
    category: 'web',
    to: '/admin/sentinel/tools/disclosure',
  },
  {
    id: 'dns',
    name: 'DNS Connection Mapper',
    description: 'List IPs, CNAME chains, NS/MX/TXT/CAA, and CDN/proxy hints.',
    teaches: 'How public DNS reveals hosting and edge infrastructure.',
    category: 'web',
    to: '/admin/sentinel/tools/dns',
  },
  {
    id: 'email-auth',
    name: 'Email Auth DNS',
    description: 'Check SPF, DMARC, and common DKIM selectors on the apex domain.',
    teaches: 'How public DNS advertises mail authentication posture.',
    category: 'web',
    to: '/admin/sentinel/tools/email-auth',
  },
  {
    id: 'csp',
    name: 'CSP Evaluator',
    description: 'Parse Content-Security-Policy and flag weak directives.',
    teaches: 'Why CSP quality matters more than mere presence.',
    category: 'web',
    to: '/admin/sentinel/tools/csp',
  },
  {
    id: 'cookies',
    name: 'Cookie Lab',
    description: 'Deep Set-Cookie review including prefixes and SameSite.',
    teaches: 'Cookie flags as session-hardening controls.',
    category: 'web',
    to: '/admin/sentinel/tools/cookies',
  },
  {
    id: 'methods',
    name: 'HTTP Method Probe',
    description: 'Safe OPTIONS/HEAD/GET probe and Allow header review.',
    teaches: 'What verb exposure can imply about an endpoint.',
    category: 'web',
    to: '/admin/sentinel/tools/methods',
  },
  {
    id: 'assets',
    name: 'Asset Inventory',
    description: 'Parse HTML for third-party scripts, styles, fonts, and mixed content.',
    teaches: 'Supply-chain and mixed-content exposure from page markup.',
    category: 'web',
    to: '/admin/sentinel/tools/assets',
  },
  {
    id: 'hsts',
    name: 'HSTS Preload Check',
    description: 'Checklist against common HSTS preload requirements.',
    teaches: 'Difference between HSTS and preload submission readiness.',
    category: 'web',
    to: '/admin/sentinel/tools/hsts',
  },
  {
    id: 'diff',
    name: 'Scan Diff',
    description: 'Compare two completed scans for score and finding changes.',
    teaches: 'Regression detection after configuration changes.',
    category: 'web',
    to: '/admin/sentinel/tools/diff',
  },
  {
    id: 'hash',
    name: 'Hash / Encoding Lab',
    description: 'Hash and encode text locally — nothing leaves the browser.',
    teaches: 'Difference between hashing, encoding, and encryption.',
    category: 'local',
    to: '/admin/sentinel/tools/hash',
  },
  {
    id: 'jwt',
    name: 'JWT Decoder',
    description: 'Decode JWT claims locally; optionally verify HS256 with a secret.',
    teaches: 'How JWTs are structured and why alg/exp matter.',
    category: 'local',
    to: '/admin/sentinel/tools/jwt',
  },
  {
    id: 'password',
    name: 'Password Strength',
    description: 'Local password guidance — never sent to the API.',
    teaches: 'Length, entropy, and common-pattern weaknesses.',
    category: 'local',
    to: '/admin/sentinel/tools/password',
  },
  {
    id: 'regex',
    name: 'Regex Lab',
    description: 'Test regular expressions against sample text locally.',
    teaches: 'Pattern matching used in log and payload analysis.',
    category: 'local',
    to: '/admin/sentinel/tools/regex',
  },
  {
    id: 'hex',
    name: 'Hex / Unicode Inspector',
    description: 'Inspect code points, hex, and lookalike characters.',
    teaches: 'Homoglyph and encoding tricks in security analysis.',
    category: 'local',
    to: '/admin/sentinel/tools/hex',
  },
  {
    id: 'pem',
    name: 'Certificate PEM Decoder',
    description: 'Decode PEM certificates/CSRs pasted locally.',
    teaches: 'Reading certificate fields without a network call.',
    category: 'local',
    to: '/admin/sentinel/tools/pem',
  },
  {
    id: 'secrets',
    name: 'Secret Pattern Scanner',
    description: 'Scan pasted text for high-entropy / key-shaped strings.',
    teaches: 'Why secret scanning is noisy and paste-scope matters.',
    category: 'local',
    to: '/admin/sentinel/tools/secrets',
  },
  {
    id: 'timestamp',
    name: 'Cron / Timestamp Lab',
    description: 'Convert unix timestamps and inspect JWT-style exp values.',
    teaches: 'Time claims and log correlation basics.',
    category: 'local',
    to: '/admin/sentinel/tools/timestamp',
  },
  {
    id: 'playbooks',
    name: 'Finding Playbooks',
    description: 'Interview-friendly explanations for common finding categories.',
    teaches: 'How to talk about impact and remediation clearly.',
    category: 'learn',
    to: '/admin/sentinel/tools/playbooks',
  },
  {
    id: 'checklist',
    name: 'Attack Surface Checklist',
    description: 'Guided per-target checklist stored in this browser.',
    teaches: 'Manual coverage beyond automated passive checks.',
    category: 'learn',
    to: '/admin/sentinel/tools/checklist',
  },
  {
    id: 'labfixtures',
    name: 'Lab Fixtures',
    description: 'Local demo targets with fixed headers for safe practice.',
    teaches: 'Repeatable labs without touching production hosts.',
    category: 'learn',
    to: '/admin/sentinel/tools/labfixtures',
  },
];

export const TOOLS_NAV = SENTINEL_TOOLS.filter((t) => t.category !== 'core').map((t) => ({
  to: t.to,
  label: t.name,
}));

export const OPERATIONS_NAV = [
  { to: '/admin/sentinel/history', label: 'Scan History' },
  { to: '/admin/sentinel/reports', label: 'Reports' },
  { to: '/admin/sentinel/settings', label: 'Settings' },
];
