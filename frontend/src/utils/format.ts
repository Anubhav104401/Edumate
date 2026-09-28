/*
 * Turning raw values from the backend into text for people.
 * All formats use Indian English conventions ("en-IN"): 28 Sept 2026, Rs 62,500.00.
 */
import { t } from '../i18n/messages';

const LOCALE = 'en-IN';

const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const moneyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR' });

/** "2026-09-28" -> "28 Sept 2026". A plain date is read as a local date, never shifted by time zone. */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return t.common.none;
  }
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

/** "2026-09-28T04:45:00Z" -> "28 Sept 2026, 10:15 am" (shown in the browser's own time zone). */
export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : t.common.none;
}

/** 62500 -> "₹62,500.00" */
export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? t.common.none : moneyFormat.format(value);
}

/** 75 -> "75.00%" ; null -> "—" */
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? t.common.none : `${value.toFixed(2)}%`;
}

/** 1536 -> "1.5 KB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Today's date as "YYYY-MM-DD" in the browser's time zone, for <input type="date">. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const longDayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

/** A moment as a friendly day: "Monday, 28 September". */
export function formatLongDay(value: Date): string {
  return longDayFormat.format(value);
}
