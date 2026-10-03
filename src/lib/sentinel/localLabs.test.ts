import { describe, expect, it } from 'vitest';
import {
  decodePem,
  inspectUnicode,
  interpretTimestamp,
  runRegex,
  scanSecrets,
} from './localLabs';

describe('localLabs', () => {
  it('runs regex matches', () => {
    const result = runRegex('a+', 'g', 'kaaab');
    expect(result.ok).toBe(true);
    expect(result.matches[0]?.text).toBe('aaa');
  });

  it('inspects unicode code points', () => {
    const rows = inspectUnicode('A');
    expect(rows[0]?.codePoint).toBe('U+0041');
  });

  it('decodes PEM framing', () => {
    const body = btoa('hello-cert');
    const pem = `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
    const result = decodePem(pem);
    expect(result.ok).toBe(true);
    expect(result.type).toBe('CERTIFICATE');
  });

  it('scans secret-like patterns', () => {
    const hits = scanSecrets('key=AKIAIOSFODNN7EXAMPLE');
    expect(hits.some((h) => h.label.includes('AWS'))).toBe(true);
  });

  it('interprets unix timestamps', () => {
    const result = interpretTimestamp('1710000000');
    expect(result.asDateUtc).toContain('2024');
  });
});
