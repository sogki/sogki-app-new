export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  notes: string;
};

const DEFAULT_ITEMS: Omit<ChecklistItem, 'done' | 'notes'>[] = [
  { id: 'authz', label: 'Confirm explicit authorisation to test this target' },
  { id: 'https', label: 'Review HTTPS / redirect / HSTS posture' },
  { id: 'headers', label: 'Review security headers (CSP, CTO, frame controls)' },
  { id: 'cookies', label: 'Review cookie flags on authenticated flows (manual)' },
  { id: 'tls', label: 'Review certificate identity and expiry' },
  { id: 'cors', label: 'Review CORS on sensitive API responses' },
  { id: 'dns', label: 'Map DNS / CDN / edge with DNS Connection Mapper' },
  { id: 'assets', label: 'Inventory third-party scripts and mixed content' },
  { id: 'disclosure', label: 'Review robots/security.txt/sitemap exposure' },
  { id: 'retest', label: 'Re-scan after fixes and run Scan Diff' },
];

function key(targetId: string) {
  return `sentinel.checklist.${targetId}`;
}

export function defaultChecklist(): ChecklistItem[] {
  return DEFAULT_ITEMS.map((i) => ({ ...i, done: false, notes: '' }));
}

export function loadChecklist(targetId: string): ChecklistItem[] {
  if (!targetId) return defaultChecklist();
  try {
    const raw = localStorage.getItem(key(targetId));
    if (!raw) return defaultChecklist();
    const parsed = JSON.parse(raw) as ChecklistItem[];
    if (!Array.isArray(parsed)) return defaultChecklist();
    return parsed;
  } catch {
    return defaultChecklist();
  }
}

export function saveChecklist(targetId: string, items: ChecklistItem[]): void {
  if (!targetId) return;
  localStorage.setItem(key(targetId), JSON.stringify(items));
}
