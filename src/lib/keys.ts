import { supabase } from './supabase';

export type KeyRecord = { key: string; value: string };

let cachedKeys: Record<string, string> | null = null;

/**
 * Fetches all public keys from the keys table and caches them.
 * Public keys are safe for client-side use (RLS restricts sensitive keys).
 */
export async function fetchKeys(): Promise<Record<string, string>> {
  if (cachedKeys) return cachedKeys;

  const { data, error } = await supabase
    .from('keys')
    .select('key, value')
    .eq('is_public', true);

  if (error) {
    throw new Error(`Failed to fetch keys: ${error.message}`);
  }

  cachedKeys = Object.fromEntries(
    (data ?? []).map((row) => [row.key, row.value])
  );
  return cachedKeys;
}

/**
 * Gets a single key value. Fetches and caches keys on first call.
 */
export async function getKey(key: string): Promise<string | undefined> {
  const keys = await fetchKeys();
  return keys[key];
}

/**
 * Gets a key value, throwing if not found.
 */
export async function getKeyOrThrow(key: string): Promise<string> {
  const value = await getKey(key);
  if (value === undefined) {
    throw new Error(`Key "${key}" not found in keys table`);
  }
  return value;
}

/**
 * Clears the keys cache (e.g. after updating keys).
 */
export function clearKeysCache(): void {
  cachedKeys = null;
}
