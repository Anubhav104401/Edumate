/*
 * The left-hand menu: which links each role sees, in which order, under which heading, with which icon.
 * To add a menu item: add a line here AND a matching <Route> in App.tsx.
 * The same list also feeds the command menu (Ctrl+K), the breadcrumb in the top bar,
 * the icon above each page title and the "Jump back in" shortcuts on the dashboard.
 */
import {
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  CreditCard,
  FileChartColumn,
  FileText,
  GraduationCap,
  Inbox,
  Landmark,
  LayoutDashboard,
  Library,
  Mail,
  Medal,
  PenLine,
  Presentation,
  ScrollText,
  ShieldCheck,
  Ticket,
  Trophy,
  UserRound,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from './api/types';
import { t } from './i18n/messages';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** The small heading this link sits under in the menu. */
  section: string;
}

const s = t.nav.sections;
const dashboard: NavItem = { to: '/', label: t.nav.dashboard, icon: LayoutDashboard, section: s.overview };

const studentMenu: NavItem[] = [
  dashboard,
  { to: '/attendance', label: t.nav.myAttendance, icon: CalendarCheck, section: s.studies },
  { to: '/hall-ticket', label: t.nav.hallTicket, icon: Ticket, section: s.studies },
  { to: '/results', label: t.nav.myResults, icon: Trophy, section: s.studies },
  { to: '/timetable', label: t.nav.myTimetable, icon: CalendarDays, section: s.studies },
  { to: '/fees', label: t.nav.myFees, icon: Wallet, section: s.finance },
  { to: '/library', label: t.nav.myLibrary, icon: BookOpen, section: s.library },
];

export const MENU: Record<Role, NavItem[]> = {
  STUDENT: studentMenu,
  GUARDIAN: studentMenu,
  FACULTY: [
    dashboard,
    { to: '/attendance/take', label: t.nav.takeAttendance, icon: ClipboardCheck, section: s.teaching },
    { to: '/attendance/course', label: t.nav.courseAttendance, icon: Users, section: s.teaching },
    { to: '/marks', label: t.nav.marksEntry, icon: PenLine, section: s.teaching },
    { to: '/timetable', label: t.nav.myTimetable, icon: CalendarDays, section: s.teaching },
  ],
  EXAM_SUPERINTENDENT: [
    dashboard,
    { to: '/results/manage', label: t.nav.resultsManage, icon: Workflow, section: s.exams },
    { to: '/reports', label: t.nav.reports, icon: FileChartColumn, section: s.exams },
    { to: '/admin/audit', label: t.nav.audit, icon: ScrollText, section: s.admin },
  ],
  ADMISSIONS_OFFICER: [
    dashboard,
    { to: '/admissions', label: t.nav.applications, icon: Inbox, section: s.admissions },
    { to: '/admissions/merit', label: t.nav.meritList, icon: Medal, section: s.admissions },
  ],
  ACCOUNTS_OFFICER: [dashboard, { to: '/fees/payments', label: t.nav.payments, icon: CreditCard, section: s.finance }],
  LIBRARIAN: [dashboard, { to: '/library/desk', label: t.nav.libraryDesk, icon: Library, section: s.library }],
  APPLICANT: [dashboard, { to: '/apply', label: t.nav.apply, icon: FileText, section: s.admissions }],
  ADMIN: [
    dashboard,
    { to: '/timetable/manage', label: t.nav.timetableManage, icon: CalendarRange, section: s.admin },
    { to: '/reports', label: t.nav.reports, icon: FileChartColumn, section: s.admin },
    { to: '/admin/audit', label: t.nav.audit, icon: ScrollText, section: s.admin },
    { to: '/admin/outbox', label: t.nav.outbox, icon: Mail, section: s.admin },
    { to: '/admin/roles', label: t.nav.roleMatrix, icon: ShieldCheck, section: s.admin },
  ],
};

/** One picture per role: used on the login page's demo accounts and on the welcome page. */
export const ROLE_ICONS: Record<Role, LucideIcon> = {
  STUDENT: GraduationCap,
  GUARDIAN: UserRound,
  FACULTY: Presentation,
  EXAM_SUPERINTENDENT: BadgeCheck,
  ADMISSIONS_OFFICER: Inbox,
  ACCOUNTS_OFFICER: Landmark,
  LIBRARIAN: Library,
  APPLICANT: FileText,
  ADMIN: ShieldCheck,
};

/**
 * The menu item a page belongs to: an exact match, or the longest link the address starts with
 * (so /admissions/7 belongs to "Applications"). Undefined for pages outside the menu, such as /pay/ORD-….
 */
export function findNavItem(role: Role, pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of MENU[role]) {
    const hit = item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(item.to + '/');
    if (hit && (!best || item.to.length > best.to.length)) {
      best = item;
    }
  }
  return best;
}
