export type Playbook = {
  id: string;
  category: string;
  title: string;
  whyItMatters: string;
  howToExplain: string;
  remediationTalkTrack: string;
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'csp',
    category: 'security_headers',
    title: 'Missing or weak Content-Security-Policy',
    whyItMatters:
      'CSP reduces the blast radius of XSS by constraining script and resource loading in the browser.',
    howToExplain:
      'I treat CSP as a defence-in-depth control. Presence alone is not enough — unsafe-inline or wildcards can erase most of the benefit.',
    remediationTalkTrack:
      'Start in report-only, inventory required origins, then enforce with nonces/hashes where possible.',
  },
  {
    id: 'hsts',
    category: 'security_headers',
    title: 'Missing Strict-Transport-Security',
    whyItMatters:
      'Without HSTS, browsers may still attempt plaintext HTTP on first visit or after cache loss.',
    howToExplain:
      'HSTS is about sticky HTTPS after trust is established. Preload is a stricter, optional next step.',
    remediationTalkTrack:
      'Serve HSTS on HTTPS with an appropriate max-age, then consider includeSubDomains/preload once stable.',
  },
  {
    id: 'cookies',
    category: 'cookies',
    title: 'Insecure cookie flags',
    whyItMatters:
      'Session cookies without Secure/HttpOnly/SameSite increase theft and CSRF-style risk classes.',
    howToExplain:
      'I describe cookies as ambient credentials. Flags are cheap controls with outsized impact.',
    remediationTalkTrack:
      'Mark auth cookies Secure; HttpOnly; SameSite=Lax or Strict unless a documented cross-site need exists.',
  },
  {
    id: 'tls',
    category: 'tls',
    title: 'TLS certificate problems',
    whyItMatters:
      'Expired or mismatched certificates break trust and train users to click through warnings.',
    howToExplain:
      'I separate “TLS is on” from “certificate identity and lifetime are healthy”.',
    remediationTalkTrack:
      'Automate renewal, monitor notAfter, and ensure SAN covers every hostname you serve.',
  },
  {
    id: 'cors',
    category: 'cors',
    title: 'Overly broad CORS',
    whyItMatters:
      'ACAO=* lets any origin read the response in a browser context for that resource.',
    howToExplain:
      'CORS is not authentication. I explain whether the resource is public by design or accidentally readable.',
    remediationTalkTrack:
      'Use an explicit origin allowlist for sensitive APIs; never combine credentials with wildcard origins.',
  },
  {
    id: 'disclosure',
    category: 'information_disclosure',
    title: 'Public metadata exposure',
    whyItMatters:
      'robots.txt and sitemaps can map interesting paths; technology headers help attackers prioritise.',
    howToExplain:
      'I distinguish intentional public files from accidental debug leakage.',
    remediationTalkTrack:
      'Keep robots/sitemaps intentional; strip noisy technology headers in production; never rely on obscurity.',
  },
];
