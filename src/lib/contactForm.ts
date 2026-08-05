import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/bootstrap';

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export type ContactFormPayload = {
  name: string;
  email: string;
  subject?: string;
  message: string;
  website?: string; // honeypot
};

export async function submitContactForm(payload: ContactFormPayload): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/site-contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof (data as { error?: string }).error === 'string'
        ? (data as { error: string }).error
        : 'Failed to send message';
    throw new Error(msg);
  }
}
