/** London Stock Exchange regular session helpers (VUAG.L). */

export type MarketSession = 'open' | 'closed' | 'pre' | 'post';

/** Parse Yahoo `marketState` when available. */
export function sessionFromYahooState(state?: string | null): MarketSession | null {
  if (!state) return null;
  const s = state.toUpperCase();
  if (s === 'REGULAR') return 'open';
  if (s === 'PRE' || s === 'PREPRE') return 'pre';
  if (s === 'POST' || s === 'POSTPOST') return 'post';
  if (s === 'CLOSED') return 'closed';
  return null;
}

/**
 * LSE cash equity hours: Mon–Fri 08:00–16:30 Europe/London.
 * Does not account for UK bank holidays.
 */
export function estimateLseSession(now = new Date()): MarketSession {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const mins = hour * 60 + minute;

  if (weekday === 'Sat' || weekday === 'Sun') return 'closed';

  const open = 8 * 60; // 08:00
  const close = 16 * 60 + 30; // 16:30
  if (mins >= open && mins < close) return 'open';
  if (mins >= 7 * 60 && mins < open) return 'pre';
  if (mins >= close && mins < 17 * 60 + 30) return 'post';
  return 'closed';
}

export function resolveMarketSession(yahooState?: string | null, now = new Date()): MarketSession {
  return sessionFromYahooState(yahooState) ?? estimateLseSession(now);
}

export function speakMarketSession(session: MarketSession): string {
  switch (session) {
    case 'open':
      return "London's open right now";
    case 'pre':
      return "London's still in pre-market";
    case 'post':
      return "London's in after-hours";
    default:
      return "London's closed at the moment";
  }
}

export function marketSessionBadge(session: MarketSession): { label: string; openish: boolean } {
  switch (session) {
    case 'open':
      return { label: 'Market open', openish: true };
    case 'pre':
      return { label: 'Pre-market', openish: true };
    case 'post':
      return { label: 'After hours', openish: false };
    default:
      return { label: 'Market closed', openish: false };
  }
}
