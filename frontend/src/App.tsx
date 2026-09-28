/*
 * The map of the whole frontend: which address (URL) shows which page, and who may open it.
 * The providers wrapped around the routes give every page toasts, confirm dialogs and the login state.
 */
import { BrowserRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import type { Role } from './api/types';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { ConfirmProvider } from './components/ConfirmDialog';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuditPage } from './pages/admin/AuditPage';
import { OutboxPage } from './pages/admin/OutboxPage';
import { RoleMatrixPage } from './pages/admin/RoleMatrixPage';
import { TimetableManagePage } from './pages/admin/TimetableManagePage';
import { PaymentsPage } from './pages/accounts/PaymentsPage';
import { ApplicationDetailPage } from './pages/admissions/ApplicationDetailPage';
import { ApplicationsPage } from './pages/admissions/ApplicationsPage';
import { MeritListPage } from './pages/admissions/MeritListPage';
import { ApplyPage } from './pages/applicant/ApplyPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/exam/ReportsPage';
import { ResultsManagePage } from './pages/exam/ResultsManagePage';
import { CourseAttendancePage } from './pages/faculty/CourseAttendancePage';
import { MarksEntryPage } from './pages/faculty/MarksEntryPage';
import { TakeAttendancePage } from './pages/faculty/TakeAttendancePage';
import { LibraryDeskPage } from './pages/library/LibraryDeskPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { HallTicketPage } from './pages/student/HallTicketPage';
import { MockGatewayPage } from './pages/student/MockGatewayPage';
import { MyAttendancePage } from './pages/student/MyAttendancePage';
import { MyFeesPage } from './pages/student/MyFeesPage';
import { MyLibraryPage } from './pages/student/MyLibraryPage';
import { MyResultsPage } from './pages/student/MyResultsPage';
import { MyTimetablePage } from './pages/student/MyTimetablePage';

const STUDENT_SIDE: Role[] = ['STUDENT', 'GUARDIAN'];

/** Wraps a page so only the listed roles can open it. */
function only(roles: Role[], page: ReactNode) {
  return <RequireAuth roles={roles}>{page}</RequireAuth>;
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Routes>
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
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
