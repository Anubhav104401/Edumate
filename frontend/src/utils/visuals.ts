/*
 * Small pure functions that decide how things LOOK: a colour for a course, the initials
 * on an avatar, the greeting for the time of day, and the parts of a number to animate.
 * "Pure" means: same input, same output, no side effects. That makes them easy to test
 * (see visuals.test.ts).
 */
import type { AdmissionStatus } from '../api/types';

/**
 * A hue (0-359 on the colour wheel) calculated from a piece of text.
 * The same text always gives the same hue, so a course (or a person) keeps its colour
 * on every page and after every reload, without anyone having to choose colours by hand.
 */
export function hueFor(text: string): number {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0; // >>> 0 keeps it a positive whole number
  }
  // Codes such as 23CS501 and 23CS502 differ only in the last character, so their hashes are
  // neighbours. Multiplying by the golden ratio and keeping the fraction throws neighbours about
  // 222 degrees apart on the colour wheel, so similar codes still get clearly different colours.
  const fraction = (hash * 0.618033988749895) % 1;
  return Math.floor(fraction * 360);
}

/** Titles written before a name ("Dr. Meera Nair"); they are not part of the name itself. */
const TITLE = /^(dr|prof|mr|mrs|ms|miss|shri|smt)\.?$/i;

/** The words of a name, without extra spaces or a leading title. */
function nameWords(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 1 && TITLE.test(words[0]) ? words.slice(1) : words;
}

/** "Aarav Sharma" -> "AS", "Dr. Meera Nair" -> "MN", "Meera" -> "M", "" -> "?" */
export function initials(name: string): string {
  const words = nameWords(name);
  if (words.length === 0) {
    return '?';
  }
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** "Aarav Sharma" -> "Aarav", "Dr. Meera Nair" -> "Meera" */
export function firstName(name: string): string {
  return nameWords(name)[0] ?? name;
}

/** Hues for the letter grades of the 10-point scale: S and A green, B-C blue, D-E amber, F red. */
const GRADE_HUES: Record<string, number> = { S: 150, A: 165, B: 230, C: 264, D: 75, E: 55, F: 25 };

export function gradeHue(grade: string): number {
  return GRADE_HUES[grade] ?? 264;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** Before 12:00 morning, before 17:00 afternoon, otherwise evening. */
export function timeOfDay(hour: number): TimeOfDay {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export interface NumberParts {
  prefix: string;
  value: number;
  decimals: number;
  suffix: string;
}

const NUMBER_IN_TEXT = /^(\D*?)(-?\d+(?:\.(\d+))?)(\D*)$/;

/**
 * Splits text such as "Rs 62500.00" into { prefix: "Rs ", value: 62500, decimals: 2, suffix: "" },
 * so the number can be counted up on screen while the words around it stay put.
 * Returns null when the text is not "words, one number, words" (e.g. "Not yet" or "1,25,000").
 */
export function splitNumber(text: string): NumberParts | null {
  const match = NUMBER_IN_TEXT.exec(text.trim());
  if (!match) {
    return null;
  }
  return {
    prefix: match[1],
    value: Number(match[2]),
    decimals: match[3]?.length ?? 0,
    suffix: match[4],
  };
}

/** Keeps a number between a lowest and a highest value: clamp(120, 0, 100) = 100. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The teaching period running at a given time of day (minutes after midnight), or null between
 * lectures. `starts[p]` is when period p begins; each lasts `length` minutes.
 */
export function periodAt(minutes: number, starts: readonly number[], length: number): number | null {
  for (let p = 1; p < starts.length; p++) {
    if (minutes >= starts[p] && minutes < starts[p] + length) {
      return p;
    }
  }
  return null;
}

/** The colour of each admission status: green for good news, red for the end of the road, amber while waiting. */
export function admissionTone(status: AdmissionStatus): 'info' | 'good' | 'warn' | 'bad' {
  switch (status) {
    case 'OFFERED':
    case 'ENROLLED':
      return 'good';
    case 'REJECTED':
    case 'WITHDRAWN':
    case 'ENROLMENT_REVERSED':
      return 'bad';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 'warn';
    default:
      return 'info';
  }
}
