import { describe, expect, it } from 'vitest';
import { admissionTone, clamp, firstName, gradeHue, hueFor, initials, periodAt, splitNumber, timeOfDay } from './visuals';

describe('hueFor', () => {
  it('always gives the same hue for the same text, inside 0-359', () => {
    expect(hueFor('CS501')).toBe(hueFor('CS501'));
    for (const code of ['CS501', 'CS502', 'MA201', '', 'Operating Systems']) {
      const hue = hueFor(code);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('gives codes that differ in one character clearly different hues', () => {
    const hues = ['23CS501', '23CS502', '23CS503', '23CS504', '23CS505'].map(hueFor);
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        const gap = Math.abs(hues[i] - hues[j]);
        expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(20); // at least 20 degrees apart
      }
    }
  });
});

describe('initials and firstName', () => {
  it('takes the first letter of the first and last word', () => {
    expect(initials('Aarav Sharma')).toBe('AS');
    expect(initials('  meera   k  nair ')).toBe('MN');
    expect(initials('Meera')).toBe('M');
    expect(initials('   ')).toBe('?');
  });

  it('finds the first name', () => {
    expect(firstName('Aarav Sharma')).toBe('Aarav');
  });

  it('skips a title written before the name', () => {
    expect(firstName('Dr. Meera Nair')).toBe('Meera');
    expect(initials('Dr. Meera Nair')).toBe('MN');
    expect(firstName('Prof Arjun Shetty')).toBe('Arjun');
    expect(firstName('Dr.')).toBe('Dr.');
  });
});

describe('timeOfDay', () => {
  it('switches at noon and at five in the evening', () => {
    expect(timeOfDay(0)).toBe('morning');
    expect(timeOfDay(11)).toBe('morning');
    expect(timeOfDay(12)).toBe('afternoon');
    expect(timeOfDay(16)).toBe('afternoon');
    expect(timeOfDay(17)).toBe('evening');
  });
});

describe('splitNumber', () => {
  it('finds the number and keeps the words around it', () => {
    expect(splitNumber('Rs 62500.00')).toEqual({ prefix: 'Rs ', value: 62500, decimals: 2, suffix: '' });
    expect(splitNumber('75.00%')).toEqual({ prefix: '', value: 75, decimals: 2, suffix: '%' });
    expect(splitNumber('3')).toEqual({ prefix: '', value: 3, decimals: 0, suffix: '' });
  });

  it('refuses text that is not "words, one number, words"', () => {
    expect(splitNumber('Not yet')).toBeNull();
    expect(splitNumber('Nil')).toBeNull();
    expect(splitNumber('1,25,000')).toBeNull();
  });
});

describe('gradeHue and clamp', () => {
  it('gives every grade letter a colour, and unknown letters the brand blue', () => {
    expect(gradeHue('S')).toBe(150);
    expect(gradeHue('F')).toBe(25);
    expect(gradeHue('?')).toBe(264);
  });

  it('keeps numbers inside the limits', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});

describe('periodAt', () => {
  const starts = [0, 540, 600, 675] as const; // P1 9:00, P2 10:00, P3 11:15

  it('finds the lecture running now, including its first minute', () => {
    expect(periodAt(540, starts, 55)).toBe(1);
    expect(periodAt(594, starts, 55)).toBe(1);
    expect(periodAt(700, starts, 55)).toBe(3);
  });

  it('gives null between lectures and outside the day', () => {
    expect(periodAt(595, starts, 55)).toBeNull(); // 9:55, the break after P1
    expect(periodAt(480, starts, 55)).toBeNull(); // 8:00
    expect(periodAt(1200, starts, 55)).toBeNull(); // 20:00
  });
});

describe('admissionTone', () => {
  it('is green for good news, red for an ending and amber while the office is working', () => {
    expect(admissionTone('ENROLLED')).toBe('good');
    expect(admissionTone('REJECTED')).toBe('bad');
    expect(admissionTone('UNDER_REVIEW')).toBe('warn');
    expect(admissionTone('DRAFT')).toBe('info');
  });
});
