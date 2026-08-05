import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/src/config/bootstrap';

let cachedKeys: Record<string, string> | null = null;

export async function fetchKeys(): Promise<Record<string, string>> {
  if (cachedKeys) return cachedKeys;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/keys?is_public=eq.true&select=key,value`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch keys: HTTP ${res.status}`);
  }

  const data = (await res.json()) as Array<{ key: string; value: string }>;
  const mapped = Object.fromEntries(data.map((row) => [row.key, row.value]));
  cachedKeys = mapped;
  return mapped;
}

export async function getKey(key: string): Promise<string | undefined> {
  const keys = await fetchKeys();
  return keys[key];
}
