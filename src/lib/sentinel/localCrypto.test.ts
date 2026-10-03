import { describe, expect, it } from 'vitest';
import {
  base64Decode,
  base64Encode,
  decodeJwt,
  hashText,
  scorePassword,
  urlDecode,
  urlEncode,
} from './localCrypto';

describe('localCrypto', () => {
  it('encodes and decodes base64/url', () => {
    expect(base64Decode(base64Encode('hello✓'))).toBe('hello✓');
    expect(urlDecode(urlEncode('a b&c'))).toBe('a b&c');
  });

  it('hashes with SHA-256', async () => {
    const digest = await hashText('SHA-256', 'abc');
    expect(digest).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('decodes JWT and flags alg=none / missing exp', async () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const payload = btoa(JSON.stringify({ sub: '1' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const result = await decodeJwt(`${header}.${payload}.`);
    expect(result.payload?.sub).toBe('1');
    expect(result.warnings.some((w) => w.includes('none'))).toBe(true);
    expect(result.warnings.some((w) => w.toLowerCase().includes('exp'))).toBe(true);
  });

  it('scores weak passwords lower than strong ones', () => {
    const weak = scorePassword('password');
    const strong = scorePassword('Tr0ub4dor&3-extra-long!');
    expect(weak.score).toBeLessThan(strong.score);
    expect(weak.tips.length).toBeGreaterThan(0);
  });
});
