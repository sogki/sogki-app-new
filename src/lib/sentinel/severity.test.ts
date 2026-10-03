import { describe, expect, it } from 'vitest';
import { severityLabel } from './severity';

describe('severityLabel', () => {
  it('maps severities to display labels', () => {
    expect(severityLabel('critical')).toBe('Critical');
    expect(severityLabel('informational')).toBe('Info');
  });
});
