/*
 * Settings for the frontend that are not text and not colours.
 */

/** Every backend URL starts with this. "/api" works in development (Vite proxy) and in Docker (nginx proxy). */
export const API_BASE = '';

/** Must match edumate.academic.attendance-threshold-percent in the backend's application.yml. */
export const ATTENDANCE_THRESHOLD = 75;

/** Must match spring.servlet.multipart.max-file-size in the backend (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The demo password printed on the login page (development builds only). */
export const DEMO_PASSWORD = 'Edumate@2026';

/** The demo accounts listed on the login page (their descriptions are in messages.ts, login.demoAccounts). */
export const DEMO_USERNAMES = [
  'student',
  'student2',
  'guardian',
  'kavya.rao',
  'arjun.shetty',
  'meera.nair',
  'sneha.kulkarni',
  'examsup',
  'examsup2',
  'admissions',
  'accounts',
  'librarian',
  'applicant',
  'applicant.minor',
  'admin',
  'ccc.admin',
] as const;

/** Show the demo-accounts helper on the login page only while developing, never in a production build. */
export const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV;

/** How long a pop-up message (toast) stays on screen, in milliseconds. */
export const TOAST_DURATION_MS = 5000;

/** Days of the week and teaching periods used by the timetable grid. */
export const DAYS = [1, 2, 3, 4, 5] as const;
export const PERIODS = [1, 2, 3, 4, 5, 6] as const;
