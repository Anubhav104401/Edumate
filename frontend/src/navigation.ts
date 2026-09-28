/*
 * The left-hand menu: which links each role sees, in which order.
 * To add a menu item: add a line here AND a matching <Route> in App.tsx.
 */
import type { Role } from './api/types';
import { t } from './i18n/messages';

export interface NavItem {
  to: string;
  label: string;
}

const studentMenu: NavItem[] = [
  { to: '/', label: t.nav.dashboard },
  { to: '/attendance', label: t.nav.myAttendance },
  { to: '/hall-ticket', label: t.nav.hallTicket },
  { to: '/results', label: t.nav.myResults },
  { to: '/fees', label: t.nav.myFees },
  { to: '/timetable', label: t.nav.myTimetable },
  { to: '/library', label: t.nav.myLibrary },
];

export const MENU: Record<Role, NavItem[]> = {
  STUDENT: studentMenu,
  GUARDIAN: studentMenu,
  FACULTY: [
    { to: '/', label: t.nav.dashboard },
    { to: '/attendance/take', label: t.nav.takeAttendance },
    { to: '/attendance/course', label: t.nav.courseAttendance },
    { to: '/marks', label: t.nav.marksEntry },
    { to: '/timetable', label: t.nav.myTimetable },
  ],
  EXAM_SUPERINTENDENT: [
    { to: '/', label: t.nav.dashboard },
    { to: '/results/manage', label: t.nav.resultsManage },
    { to: '/reports', label: t.nav.reports },
    { to: '/admin/audit', label: t.nav.audit },
  ],
  ADMISSIONS_OFFICER: [
    { to: '/', label: t.nav.dashboard },
    { to: '/admissions', label: t.nav.applications },
    { to: '/admissions/merit', label: t.nav.meritList },
  ],
  ACCOUNTS_OFFICER: [
    { to: '/', label: t.nav.dashboard },
    { to: '/fees/payments', label: t.nav.payments },
  ],
  LIBRARIAN: [
    { to: '/', label: t.nav.dashboard },
    { to: '/library/desk', label: t.nav.libraryDesk },
  ],
  APPLICANT: [
    { to: '/', label: t.nav.dashboard },
    { to: '/apply', label: t.nav.apply },
  ],
  ADMIN: [
    { to: '/', label: t.nav.dashboard },
    { to: '/timetable/manage', label: t.nav.timetableManage },
    { to: '/reports', label: t.nav.reports },
    { to: '/admin/audit', label: t.nav.audit },
    { to: '/admin/outbox', label: t.nav.outbox },
    { to: '/admin/roles', label: t.nav.roleMatrix },
  ],
};
