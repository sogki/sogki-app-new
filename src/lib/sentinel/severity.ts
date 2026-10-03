import type { Severity } from './types';

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  informational: 'Info',
};

export function severityLabel(severity: Severity): string {
  return SEVERITY_LABELS[severity];
}
