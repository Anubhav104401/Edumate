/*
 * Form checks run in the browser as the user types or presses Save.
 * They mirror the @NotBlank / @Email / @DecimalMax rules on ApplicationForm.java in the backend.
 */
import { t } from '../i18n/messages';
import type { ApplicationForm } from '../api/types';

export type FieldErrors = Partial<Record<keyof ApplicationForm, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+ -]{7,20}$/;

export function validateApplication(form: ApplicationForm, today: string): FieldErrors {
  const errors: FieldErrors = {};
  const v = t.apply.validation;
  if (!form.fullName.trim()) errors.fullName = v.required;
  if (!form.dateOfBirth) errors.dateOfBirth = v.required;
  else if (form.dateOfBirth >= today) errors.dateOfBirth = v.dobFuture;
  if (!form.email.trim()) errors.email = v.required;
  else if (!EMAIL.test(form.email.trim())) errors.email = v.email;
  if (form.phone && !PHONE.test(form.phone)) errors.phone = v.phone;
  if (!form.programId) errors.programId = v.required;
  if (!validScore(form.entranceScore)) errors.entranceScore = v.score;
  if (!validScore(form.qualifyingPercent)) errors.qualifyingPercent = v.score;
  if (form.guardianEmail && !EMAIL.test(form.guardianEmail.trim())) errors.guardianEmail = v.email;
  if (form.guardianPhone && !PHONE.test(form.guardianPhone)) errors.guardianPhone = v.phone;
  return errors;
}

function validScore(value: number | null): boolean {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= 100);
}

/** Age in whole years on a given day ("YYYY-MM-DD" strings). */
export function ageOn(dateOfBirth: string, day: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [y, m, d] = day.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) {
    age -= 1;
  }
  return age;
}
