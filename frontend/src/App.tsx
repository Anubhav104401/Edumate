/*
 * The map of the whole frontend: which address (URL) shows which page, and who may open it.
 * The providers wrapped around the routes give every page the theme, animation settings, smooth
 * scrolling, toasts, confirm dialogs and the login state.
 *
 * Pages are loaded LAZILY: each page's code is a separate file that the browser downloads the first
 * time that page is opened ("code splitting"). The first visit therefore downloads far less.
 */
import { MotionConfig } from 'motion/react';
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import type { Role } from './api/types';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { ConfirmProvider } from './components/ConfirmDialog';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { TopLoader } from './components/TopLoader';
import { SmoothScroll } from './motion/SmoothScroll';
import { LoginPage } from './pages/LoginPage';
import { ThemeProvider } from './theme/ThemeContext';

/** lazy() for a file whose component is a named export: lazyPage(() => import('./pages/X'), 'X'). */
function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

const LandingPage = lazyPage(() => import('./pages/LandingPage'), 'LandingPage');
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'), 'DashboardPage');
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'), 'NotFoundPage');
const MyAttendancePage = lazyPage(() => import('./pages/student/MyAttendancePage'), 'MyAttendancePage');
const HallTicketPage = lazyPage(() => import('./pages/student/HallTicketPage'), 'HallTicketPage');
const MyResultsPage = lazyPage(() => import('./pages/student/MyResultsPage'), 'MyResultsPage');
const MyFeesPage = lazyPage(() => import('./pages/student/MyFeesPage'), 'MyFeesPage');
const MockGatewayPage = lazyPage(() => import('./pages/student/MockGatewayPage'), 'MockGatewayPage');
const MyLibraryPage = lazyPage(() => import('./pages/student/MyLibraryPage'), 'MyLibraryPage');
const MyTimetablePage = lazyPage(() => import('./pages/student/MyTimetablePage'), 'MyTimetablePage');
const TakeAttendancePage = lazyPage(() => import('./pages/faculty/TakeAttendancePage'), 'TakeAttendancePage');
const CourseAttendancePage = lazyPage(() => import('./pages/faculty/CourseAttendancePage'), 'CourseAttendancePage');
const MarksEntryPage = lazyPage(() => import('./pages/faculty/MarksEntryPage'), 'MarksEntryPage');
const ResultsManagePage = lazyPage(() => import('./pages/exam/ResultsManagePage'), 'ResultsManagePage');
const ReportsPage = lazyPage(() => import('./pages/exam/ReportsPage'), 'ReportsPage');
const ApplicationsPage = lazyPage(() => import('./pages/admissions/ApplicationsPage'), 'ApplicationsPage');
const MeritListPage = lazyPage(() => import('./pages/admissions/MeritListPage'), 'MeritListPage');
const ApplicationDetailPage = lazyPage(() => import('./pages/admissions/ApplicationDetailPage'), 'ApplicationDetailPage');
const ApplyPage = lazyPage(() => import('./pages/applicant/ApplyPage'), 'ApplyPage');
const PaymentsPage = lazyPage(() => import('./pages/accounts/PaymentsPage'), 'PaymentsPage');
const LibraryDeskPage = lazyPage(() => import('./pages/library/LibraryDeskPage'), 'LibraryDeskPage');
const TimetableManagePage = lazyPage(() => import('./pages/admin/TimetableManagePage'), 'TimetableManagePage');
const AuditPage = lazyPage(() => import('./pages/admin/AuditPage'), 'AuditPage');
const OutboxPage = lazyPage(() => import('./pages/admin/OutboxPage'), 'OutboxPage');
const RoleMatrixPage = lazyPage(() => import('./pages/admin/RoleMatrixPage'), 'RoleMatrixPage');

const STUDENT_SIDE: Role[] = ['STUDENT', 'GUARDIAN'];

/** Wraps a page so only the listed roles can open it. */
function only(roles: Role[], page: ReactNode) {
  return <RequireAuth roles={roles}>{page}</RequireAuth>;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        {/* reducedMotion="user": people who ask their computer for less motion get fades instead of movement. */}
        <MotionConfig reducedMotion="user">
          <SmoothScroll>
            <ToastProvider>
              <ConfirmProvider>
                <AuthProvider>
                  <TopLoader />
                  <Suspense fallback={null}>
                    <Routes>
                      <Route path="/welcome" element={<LandingPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route
                        element={
                          <RequireAuth>
                            <Layout />
                          </RequireAuth>
                        }
                      >
                        <Route index element={<DashboardPage />} />
                        {/* Students and guardians */}
                        <Route path="attendance" element={only(STUDENT_SIDE, <MyAttendancePage />)} />
                        <Route path="hall-ticket" element={only(STUDENT_SIDE, <HallTicketPage />)} />
                        <Route path="results" element={only(STUDENT_SIDE, <MyResultsPage />)} />
                        <Route path="fees" element={only(STUDENT_SIDE, <MyFeesPage />)} />
                        <Route path="pay/:orderId" element={only(STUDENT_SIDE, <MockGatewayPage />)} />
                        <Route path="library" element={only(STUDENT_SIDE, <MyLibraryPage />)} />
                        <Route path="timetable" element={only([...STUDENT_SIDE, 'FACULTY'], <MyTimetablePage />)} />
                        {/* Faculty */}
                        <Route path="attendance/take" element={only(['FACULTY'], <TakeAttendancePage />)} />
                        <Route path="attendance/course" element={only(['FACULTY'], <CourseAttendancePage />)} />
                        <Route path="marks" element={only(['FACULTY'], <MarksEntryPage />)} />
                        {/* Examinations */}
                        <Route path="results/manage" element={only(['EXAM_SUPERINTENDENT'], <ResultsManagePage />)} />
                        <Route path="reports" element={only(['EXAM_SUPERINTENDENT', 'ADMIN'], <ReportsPage />)} />
                        {/* Admissions */}
                        <Route path="admissions" element={only(['ADMISSIONS_OFFICER', 'ADMIN'], <ApplicationsPage />)} />
                        <Route path="admissions/merit" element={only(['ADMISSIONS_OFFICER', 'ADMIN'], <MeritListPage />)} />
                        <Route path="admissions/:id" element={only(['ADMISSIONS_OFFICER', 'ADMIN'], <ApplicationDetailPage />)} />
                        <Route path="apply" element={only(['APPLICANT'], <ApplyPage />)} />
                        {/* Accounts and library */}
                        <Route path="fees/payments" element={only(['ACCOUNTS_OFFICER', 'ADMIN'], <PaymentsPage />)} />
                        <Route path="library/desk" element={only(['LIBRARIAN'], <LibraryDeskPage />)} />
                        {/* Administration */}
                        <Route path="timetable/manage" element={only(['ADMIN'], <TimetableManagePage />)} />
                        <Route path="admin/audit" element={only(['ADMIN', 'EXAM_SUPERINTENDENT'], <AuditPage />)} />
                        <Route path="admin/outbox" element={only(['ADMIN'], <OutboxPage />)} />
                        <Route path="admin/roles" element={only(['ADMIN'], <RoleMatrixPage />)} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </AuthProvider>
              </ConfirmProvider>
            </ToastProvider>
          </SmoothScroll>
        </MotionConfig>
      </ThemeProvider>
    </BrowserRouter>
  );
}
