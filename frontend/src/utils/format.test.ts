import { describe, expect, it } from 'vitest';
import { formatBytes, formatDate, formatMoney, formatPercent } from './format';

describe('format', () => {
  it('shows percentages with two decimals and a dash for "no value"', () => {
    expect(formatPercent(75)).toBe('75.00%');
    expect(formatPercent(null)).toBe('—');
  });

  it('shows rupees with Indian digit grouping', () => {
    expect(formatMoney(125000)).toContain('1,25,000');
  });

  it('shows a plain date without shifting it by time zone', () => {
    expect(formatDate('2026-09-28')).toContain('2026');
    expect(formatDate('2026-09-28')).toContain('28');
  });

  it('shows file sizes in B, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
