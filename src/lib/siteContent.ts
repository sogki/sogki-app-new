import type { SiteContentMap } from './siteData';

/**
 * Get a string value from site content with fallback.
 */
export function getString(content: SiteContentMap, key: string, fallback: string): string {
  const v = content[key];
  if (v === null || v === undefined) return fallback;
  return String(v);
}

/**
 * Get a boolean value from site content with fallback.
 */
export function getBool(content: SiteContentMap, key: string, fallback: boolean): boolean {
  const v = content[key];
  if (v === null || v === undefined) return fallback;
  return v === true || v === 'true' || v === 1;
}

/**
 * Get a JSON value (array/object) from site content with fallback.
 */
export function getJson<T>(content: SiteContentMap, key: string, fallback: T): T {
  const v = content[key];
  if (v === null || v === undefined) return fallback;
  return v as T;
}
