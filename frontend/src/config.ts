/*
 * Settings for the frontend that are not text and not colours.
 */
import type { Role } from './api/types';

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

/** The role of each demo account, so the login page can show the right icon next to it. */
export const DEMO_ROLES: Record<(typeof DEMO_USERNAMES)[number], Role> = {
  student: 'STUDENT',
  student2: 'STUDENT',
  guardian: 'GUARDIAN',
  'kavya.rao': 'FACULTY',
  'arjun.shetty': 'FACULTY',
  'meera.nair': 'FACULTY',
  'sneha.kulkarni': 'FACULTY',
  examsup: 'EXAM_SUPERINTENDENT',
  examsup2: 'EXAM_SUPERINTENDENT',
  admissions: 'ADMISSIONS_OFFICER',
  accounts: 'ACCOUNTS_OFFICER',
  librarian: 'LIBRARIAN',
  applicant: 'APPLICANT',
  'applicant.minor': 'APPLICANT',
  admin: 'ADMIN',
  'ccc.admin': 'ADMIN',
};

/** Show the demo-accounts helper on the login page only while developing, never in a production build. */
export const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV;

/** How long a pop-up message (toast) stays on screen, in milliseconds. */
export const TOAST_DURATION_MS = 5000;

/** Days of the week and teaching periods used by the timetable grid. */
export const DAYS = [1, 2, 3, 4, 5] as const;
export const PERIODS = [1, 2, 3, 4, 5, 6] as const;

/** Smooth scrolling (Lenis): how much of the remaining distance is covered each frame. 0.1 glides; 1 = no smoothing. */
export const SMOOTH_SCROLL_LERP = 0.1;

/** Where this browser remembers the light/dark choice (public/theme-init.js reads the same key). */
export const THEME_STORAGE_KEY = 'edumate.theme';

/** Where this browser remembers whether the side menu is collapsed. */
export const SIDEBAR_STORAGE_KEY = 'edumate.sidebar';

/** Ctrl + this key (Cmd on a Mac) opens the command menu. */
export const PALETTE_KEY = 'k';

/** The loading line at the top waits this long before appearing, so very quick requests do not flicker it. */
export const LOADER_DELAY_MS = 150;

/** When each teaching period starts, in minutes after midnight (index 1 = P1 at 9:00 … 6 = P6 at 15:00). */
export const PERIOD_STARTS = [0, 9 * 60, 10 * 60, 11 * 60 + 15, 12 * 60 + 15, 14 * 60, 15 * 60] as const;

/** How long a lecture lasts, in minutes. */
export const PERIOD_LENGTH_MINUTES = 55;
