const QUOTA_RE =
  /quota|billing|exceeded your current|insufficient.?quota|rate.?limit|402|429|paid_plan/i;

export function isQuotaOrBillingError(message: string): boolean {
  return QUOTA_RE.test(message);
}

/** Short toast-friendly message — strips OpenAI docs URLs and billing dumps. */
export function friendlyEiError(raw: string, fallback = 'Something went wrong'): string {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (isQuotaOrBillingError(text)) {
    return 'OpenAI quota exceeded — using offline voice for now. Top up billing at platform.openai.com.';
  }
  // Strip trailing "For more information… docs: https://…"
  const cleaned = text
    .replace(/\s*For more information on this error[^.]*\./gi, '')
    .replace(/\s*https?:\/\/\S+/gi, '')
    .trim();
  return cleaned.slice(0, 160) || fallback;
}

const SKIP_KEY = 'ei_skip_openai_until';

/** Remember OpenAI quota for a short window so we don't hammer a dead key. */
export function markOpenAiQuotaExhausted(minutes = 30): void {
  try {
    sessionStorage.setItem(SKIP_KEY, String(Date.now() + minutes * 60_000));
  } catch {
    /* ignore */
  }
}

export function shouldSkipOpenAi(): boolean {
  try {
    const until = Number(sessionStorage.getItem(SKIP_KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

export function clearOpenAiSkip(): void {
  try {
    sessionStorage.removeItem(SKIP_KEY);
  } catch {
    /* ignore */
  }
}
