/*
 * One small function per backend URL. Screens call these instead of writing URLs themselves,
 * so if a URL ever changes it is changed here only.
 * Example: api.attendance.mine() sends  GET /api/attendance/me  and returns CourseAttendance[].
 */
import { download, request, uploadWithProgress } from './http';
import type {
  AdmissionAction,
  AdmissionStatus,
  ApplicationForm,
  ApplicationSummary,
  ApplicationView,
  AttendanceSheet,
  AuditEntry,
  Book,
  CallbackResult,
  CheckoutView,
  Clash,
  ComputeSummary,
  ConsentView,
  ConsolidatedReport,
  CourseAttendance,
  CourseShortfall,
  CourseView,
  DashboardCard,
  DocumentType,
  DocumentView,
  ExamSession,
  FacultyLoad,
  FeeAccount,
  HallTicket,
  InitiatedPayment,
  LoanView,
  LoginResponse,
  MarkLine,
  MarksSheet,
  Me,
  MeritList,
  NotifyResult,
  OutboxMessage,
  PaymentView,
  Program,
  ResultSetView,
  RoleRule,
  SaveSheetRequest,
  SemesterResult,
  StudentAttendance,
  StudentSummary,
  TimetableEntry,
  TimetableView,
} from './types';

/** Builds "?a=1&b=x" from an object, skipping empty values. */
function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<LoginResponse>('POST', '/api/auth/login', { username, password }),
    me: () => request<Me>('GET', '/api/auth/me'),
  },

  dashboard: () => request<DashboardCard[]>('GET', '/api/dashboard'),

  academic: {
    programs: () => request<Program[]>('GET', '/api/academic/programs'),
    myCourses: () => request<CourseView[]>('GET', '/api/academic/courses/mine'),
    campusCourses: () => request<CourseView[]>('GET', '/api/academic/courses'),
    examSessions: () => request<ExamSession[]>('GET', '/api/academic/exam-sessions'),
    searchStudents: (q: string) => request<StudentSummary[]>('GET', '/api/academic/students' + query({ q })),
  },

  attendance: {
    mine: () => request<CourseAttendance[]>('GET', '/api/attendance/me'),
    loadSheet: (courseId: number, section: string, date: string, period: number) =>
      request<AttendanceSheet>('GET', '/api/attendance/sessions' + query({ courseId, section, date, period })),
    saveSheet: (body: SaveSheetRequest) => request<AttendanceSheet>('PUT', '/api/attendance/sessions', body),
    courseSummary: (courseId: number, section: string) =>
      request<StudentAttendance[]>('GET', `/api/attendance/courses/${courseId}/summary` + query({ section })),
    shortfall: (courseId: number, section: string, threshold?: number) =>
      request<StudentAttendance[]>('GET', `/api/attendance/courses/${courseId}/shortfall` + query({ section, threshold })),
    notifyGuardians: (courseId: number, section: string) =>
      request<NotifyResult>('POST', `/api/attendance/courses/${courseId}/notify-guardians` + query({ section })),
  },

  exams: {
    marks: (courseId: number, examSessionId: number) =>
      request<MarksSheet>('GET', '/api/exams/marks' + query({ courseId, examSessionId })),
    amendMark: (markId: number, internalMarks: number, version: number, reason: string) =>
      request<MarkLine>('PUT', `/api/exams/marks/${markId}`, { internalMarks, version, reason }),
    hallTicket: () => request<HallTicket>('GET', '/api/exams/hall-ticket/me'),
    myResults: () => request<SemesterResult[]>('GET', '/api/exams/results/me'),
    resultSets: () => request<ResultSetView[]>('GET', '/api/exams/result-sets'),
    compute: (examSessionId: number, programId: number, semester: number) =>
      request<ComputeSummary>('POST', '/api/exams/result-sets/compute', { examSessionId, programId, semester }),
    approve: (id: number) => request<ResultSetView>('POST', `/api/exams/result-sets/${id}/approve`),
    publish: (id: number) => request<ResultSetView>('POST', `/api/exams/result-sets/${id}/publish`),
  },

  reports: {
    consolidated: (resultSetId: number) =>
      request<ConsolidatedReport>('GET', '/api/reports/consolidated-marks' + query({ resultSetId })),
    consolidatedCsv: (resultSetId: number) =>
      download('/api/reports/consolidated-marks' + query({ resultSetId, format: 'csv' })),
    shortfall: (programId: number, semester: number, section: string) =>
      request<CourseShortfall[]>('GET', '/api/reports/attendance-shortfall' + query({ programId, semester, section })),
  },

  fees: {
    mine: () => request<FeeAccount>('GET', '/api/fees/me'),
    initiate: (feeDemandId: number) => request<InitiatedPayment>('POST', '/api/fees/payments', { feeDemandId }),
    payment: (orderId: string) => request<PaymentView>('GET', `/api/fees/payments/${orderId}`),
    recent: () => request<PaymentView[]>('GET', '/api/fees/payments'),
    ledger: (usn: string) => request<FeeAccount>('GET', '/api/fees/ledger' + query({ usn })),
    checkout: (orderId: string) => request<CheckoutView>('GET', `/api/payments/gateway/mock/${orderId}`),
    completeMock: (orderId: string, success: boolean, deliveries: number) =>
      request<CallbackResult[]>('POST', `/api/payments/gateway/mock/${orderId}/complete`, { success, deliveries }),
  },

  admissions: {
    mine: () => request<ApplicationView>('GET', '/api/admissions/my-application'),
    create: (form: ApplicationForm) => request<ApplicationView>('POST', '/api/admissions/applications', form),
    update: (id: number, form: ApplicationForm) => request<ApplicationView>('PUT', `/api/admissions/applications/${id}`, form),
    list: (status?: AdmissionStatus | '', q?: string) =>
      request<ApplicationSummary[]>('GET', '/api/admissions/applications' + query({ status, q })),
    get: (id: number) => request<ApplicationView>('GET', `/api/admissions/applications/${id}`),
    transition: (id: number, action: AdmissionAction, reason?: string) =>
      request<ApplicationView>('POST', `/api/admissions/applications/${id}/transitions`, { action, reason: reason ?? null }),
    meritList: (programId: number) => request<MeritList>('GET', '/api/admissions/merit-list' + query({ programId })),
    documents: (id: number) => request<DocumentView[]>('GET', `/api/admissions/applications/${id}/documents`),
    uploadDocument: (id: number, type: DocumentType, file: File, onProgress: (p: number) => void) => {
      const form = new FormData();
      form.append('type', type);
      form.append('file', file);
      return uploadWithProgress<DocumentView>(`/api/admissions/applications/${id}/documents`, form, onProgress);
    },
    downloadDocument: (documentId: number) => download(`/api/admissions/documents/${documentId}/content`),
    deleteDocument: (documentId: number) => request<void>('DELETE', `/api/admissions/documents/${documentId}`),
  },

  consent: {
    request: (applicationId: number) => request<ConsentView>('POST', `/api/consent/applications/${applicationId}/request`),
    verify: (applicationId: number, otp: string) =>
      request<ConsentView>('POST', `/api/consent/applications/${applicationId}/verify`, { otp }),
    history: (applicationId: number) => request<ConsentView[]>('GET', `/api/consent/applications/${applicationId}`),
    revoke: (consentId: number) => request<ConsentView>('POST', `/api/consent/${consentId}/revoke`),
  },

  timetable: {
    view: (programId: number, semester: number, section: string) =>
      request<TimetableView>('GET', '/api/timetable' + query({ programId, semester, section })),
    generate: (programId: number, semester: number, section: string) =>
      request<TimetableView>('POST', '/api/timetable/generate', { programId, semester, section }),
    move: (entryId: number, day: number, period: number, room: string) =>
      request<TimetableEntry>('PUT', `/api/timetable/entries/${entryId}`, { day, period, room }),
    clashes: (programId: number, semester: number, section: string) =>
      request<Clash[]>('GET', '/api/timetable/clashes' + query({ programId, semester, section })),
    publish: (programId: number, semester: number, section: string) =>
      request<TimetableView>('POST', '/api/timetable/publish', { programId, semester, section }),
    mine: () => request<TimetableEntry[]>('GET', '/api/timetable/me'),
    workload: () => request<FacultyLoad[]>('GET', '/api/timetable/workload'),
  },

  library: {
    books: (q?: string) => request<Book[]>('GET', '/api/library/books' + query({ q })),
    myLoans: () => request<LoanView[]>('GET', '/api/library/loans/me'),
    openLoans: () => request<LoanView[]>('GET', '/api/library/loans'),
    issue: (bookId: number, usn: string) => request<LoanView>('POST', '/api/library/loans', { bookId, usn }),
    returnLoan: (loanId: number) => request<LoanView>('POST', `/api/library/loans/${loanId}/return`),
  },

  admin: {
    audit: (entityType?: string, entityId?: string) =>
      request<AuditEntry[]>('GET', '/api/audit' + query({ entityType, entityId })),
    outbox: () => request<OutboxMessage[]>('GET', '/api/notifications/outbox'),
    roleMatrix: () => request<RoleRule[]>('GET', '/api/admin/role-matrix'),
  },
};
