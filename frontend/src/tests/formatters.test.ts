import { describe, it, expect } from 'vitest';
import {
  formatMW,
  formatPercent,
  formatDateTime,
  formatShortDate,
  formatTimeOnly,
} from '../lib/formatters';

describe('Formatters Utility', () => {
  it('formats MW values correctly', () => {
    expect(formatMW(12500)).toBe('12,500.0 MW');
    expect(formatMW(12500, 0)).toBe('12,500 MW');
    expect(formatMW(null)).toBe('—');
    expect(formatMW(undefined)).toBe('—');
  });

  it('formats percentages correctly', () => {
    expect(formatPercent(17.87)).toBe('17.9%');
    expect(formatPercent(17.87, 2)).toBe('17.87%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats UTC date-time correctly', () => {
    const formatted = formatDateTime('2026-01-02T14:30:00Z');
    expect(formatted).toContain('02 Jan 2026');
    expect(formatted).toContain('14:30');
    expect(formatted).toContain('UTC');
    expect(formatDateTime(null)).toBe('—');
  });

  it('formats short date correctly', () => {
    expect(formatShortDate('2026-01-15T00:00:00Z')).toBe('15 Jan');
  });

  it('formats time only correctly', () => {
    expect(formatTimeOnly('2026-01-02T09:50:00Z')).toBe('09:50');
  });
});
