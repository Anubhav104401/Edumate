import { describe, expect, it } from 'vitest';
import type { ApplicationForm } from '../api/types';
import { ageOn, validateApplication } from './validation';

const valid: ApplicationForm = {
  fullName: 'Priya Nair',
  dateOfBirth: '2002-03-14',
  email: 'priya@example.test',
  phone: '9876500001',
  programId: 2,
  category: 'GEN',
  entranceScore: 78.5,
  qualifyingPercent: 81.2,
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
};

describe('validateApplication', () => {
  it('accepts a complete form', () => {
    expect(validateApplication(valid, '2026-09-28')).toEqual({});
  });

  it('reports every problem at once', () => {
    const errors = validateApplication(
      { ...valid, fullName: ' ', email: 'not-an-email', entranceScore: 101, dateOfBirth: '2030-01-01' },
      '2026-09-28',
    );
    expect(Object.keys(errors).sort()).toEqual(['dateOfBirth', 'email', 'entranceScore', 'fullName']);
  });
});

describe('ageOn', () => {
  it('counts whole years and handles the birthday itself', () => {
    expect(ageOn('2009-06-15', '2026-06-14')).toBe(16);
    expect(ageOn('2009-06-15', '2026-06-15')).toBe(17);
  });
});
