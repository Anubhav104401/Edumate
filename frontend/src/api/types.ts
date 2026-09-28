/*
 * The shape of every piece of JSON the backend sends or receives.
 * These are TypeScript "types": they do not run, they only let the editor and the
 * compiler check that the code uses the right field names (for example `fullName`, not `fullname`).
 * Each type mirrors a Java record in the backend with the same name.
 */

export type Role =
  | 'ADMIN'
  | 'EXAM_SUPERINTENDENT'
  | 'FACULTY'
  | 'ADMISSIONS_OFFICER'
  | 'ACCOUNTS_OFFICER'
  | 'LIBRARIAN'
  | 'STUDENT'
  | 'GUARDIAN'
  | 'APPLICANT';

/** Dates travel as text: "2026-09-28" (a day) or "2026-09-28T10:15:00Z" (an instant). */
export type IsoDate = string;
export type IsoInstant = string;

// ---------- Login ----------
export interface Me {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  campusCode: string;
  studentId: number | null;
}

export interface LoginResponse {
  token: string;
  expiresAt: IsoInstant;
  user: Me;
}

/** Every error from the backend has this shape (see ApiError.java). */
export interface ApiErrorBody {
  timestamp: IsoInstant;
  status: number;
  code: string;
  message: string;
  path: string;
  traceId: string | null;
  fieldErrors: Record<string, string> | null;
}

// ---------- Dashboard ----------
export interface DashboardCard {
  key: string;
  label: string;
  value: string;
  hint: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  link: string;
}

// ---------- Academic structure ----------
export interface Program {
  id: number;
  code: string;
  name: string;
  level: string;
  totalSeats: number;
  campusCode: string;
}

export interface CourseView {
  id: number;
  code: string;
  name: string;
  credits: number;
  weeklyHours: number;
  programId: number;
  programName: string;
  semester: number;
  facultyId: number | null;
  facultyName: string | null;
  sections: string[];
}

export interface ExamSession {
  id: number;
  code: string;
  name: string;
  startsOn: IsoDate;
  campusCode: string;
}

export interface StudentSummary {
  id: number;
  usn: string;
  fullName: string;
  semester: number;
  section: string;
}

// ---------- Attendance ----------
export interface CourseAttendance {
  courseId: number;
  courseCode: string;
  courseName: string;
  held: number;
  attended: number;
  percent: number | null;
  meetsThreshold: boolean;
  medicalExemption: boolean;
  plannedTotal: number;
  canMiss: number;
  maxAchievablePercent: number | null;
  status: 'OK' | 'WARNING' | 'SHORTFALL';
}

export interface StudentAttendance {
  studentId: number;
  usn: string;
  fullName: string;
  held: number;
  attended: number;
  percent: number | null;
  meetsThreshold: boolean;
}

export interface SheetRow {
  studentId: number;
  usn: string;
  fullName: string;
  present: boolean;
}

export interface AttendanceSheet {
  sessionId: number | null;
  version: number | null;
  courseId: number;
  courseCode: string;
  courseName: string;
  section: string;
  date: IsoDate;
  period: number;
  alreadyTaken: boolean;
  rows: SheetRow[];
}

export interface SaveSheetRequest {
  courseId: number;
  section: string;
  date: IsoDate;
  period: number;
  version: number | null;
  marks: { studentId: number; present: boolean }[];
}

export interface NotifyResult {
  belowThreshold: number;
  queued: number;
  alreadyNotified: number;
  queuedFor: string[];
}

// ---------- Examinations ----------
export interface CourseEligibility {
  courseId: number;
  courseCode: string;
  courseName: string;
  attendancePercent: number | null;
  attendanceOk: boolean;
  medicalExemption: boolean;
  assessmentComplete: boolean;
  eligible: boolean;
  rule: string;
  reasons: string[];
}

export interface HallTicket {
  studentId: number;
  usn: string;
  fullName: string;
  examSessionCode: string;
  examSessionName: string;
  examsStartOn: IsoDate;
  thresholdPercent: number;
  feePaid: boolean;
  issued: boolean;
  courses: CourseEligibility[];
}

export interface CourseLine {
  courseCode: string;
  courseName: string;
  credits: number;
  totalMarks: number;
  grade: string;
  gradePoint: number;
}

export interface SemesterResult {
  semester: number;
  examSessionCode: string;
  examSessionName: string;
  sgpa: number;
  cgpa: number;
  creditsRegistered: number;
  creditsEarned: number;
  outcome: 'PASS' | 'FAIL';
  publishedAt: IsoInstant | null;
  courses: CourseLine[];
}

export type ResultStatus = 'DRAFT' | 'COMPUTED' | 'AWAITING_SECOND_APPROVAL' | 'APPROVED' | 'PUBLISHED';

export interface ResultSetView {
  id: number;
  examSessionId: number;
  examSessionCode: string;
  programId: number;
  programName: string;
  semester: number;
  status: ResultStatus;
  computedBy: string | null;
  computedAt: IsoInstant | null;
  firstApprover: string | null;
  firstApprovedAt: IsoInstant | null;
  secondApprover: string | null;
  secondApprovedAt: IsoInstant | null;
  publishedBy: string | null;
  publishedAt: IsoInstant | null;
}

export interface ComputeSummary {
  resultSet: ResultSetView;
  students: number;
  passed: number;
  failed: number;
  averageSgpa: number;
}

export interface ReportRow {
  usn: string;
  fullName: string;
  grades: Record<string, string>;
  sgpa: number;
  cgpa: number;
  creditsEarned: number;
  creditsRegistered: number;
  outcome: string;
}

export interface ConsolidatedReport {
  resultSet: ResultSetView;
  courseCodes: string[];
  rows: ReportRow[];
}

export interface CourseShortfall {
  courseId: number;
  courseCode: string;
  courseName: string;
  students: StudentAttendance[];
}

export interface MarkLine {
  markId: number;
  version: number;
  studentId: number;
  usn: string;
  fullName: string;
  internalMarks: number | null;
  externalMarks: number | null;
  revalued: boolean;
  total: number | null;
  grade: string | null;
  updatedBy: string | null;
  updatedAt: IsoInstant | null;
}

export interface MarksSheet {
  courseId: number;
  courseCode: string;
  courseName: string;
  examSessionId: number;
  locked: boolean;
  lines: MarkLine[];
}

// ---------- Fees ----------
export interface DemandView {
  id: number;
  description: string;
  amount: number;
  paid: number;
  due: number;
  dueDate: IsoDate;
  status: 'PAID' | 'DUE' | 'OVERDUE';
}

export interface PaymentView {
  id: number;
  orderId: string;
  studentId: number;
  amount: number;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED';
  txnRef: string | null;
  receiptNo: string | null;
  failureReason: string | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface LedgerLine {
  at: IsoInstant;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  reference: string;
}

export interface FeeAccount {
  studentId: number;
  usn: string;
  fullName: string;
  outstanding: number;
  demands: DemandView[];
  payments: PaymentView[];
  ledger: LedgerLine[];
}

export interface InitiatedPayment {
  orderId: string;
  amount: number;
  description: string;
  checkoutPath: string;
}

export interface CheckoutView {
  orderId: string;
  amount: number;
  status: string;
}

export interface CallbackResult {
  outcome: 'PROCESSED' | 'DUPLICATE_IGNORED';
  orderId: string;
  paymentStatus: string;
  receiptNo: string | null;
  failureReason: string | null;
}

// ---------- Admissions ----------
export type AdmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'OFFERED'
  | 'ENROLLED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ENROLMENT_REVERSED';

export type AdmissionAction =
  | 'SUBMIT'
  | 'WITHDRAW'
  | 'START_REVIEW'
  | 'SHORTLIST'
  | 'REJECT'
  | 'OFFER'
  | 'ENROL'
  | 'REVERSE_ENROLMENT';

export type DocumentType = 'PHOTO' | 'ID_PROOF' | 'MARKSHEET_10' | 'MARKSHEET_12' | 'CATEGORY_CERTIFICATE';

export interface ApplicationForm {
  fullName: string;
  dateOfBirth: IsoDate;
  email: string;
  phone: string;
  programId: number | null;
  category: 'GEN' | 'OBC' | 'SC' | 'ST';
  entranceScore: number | null;
  qualifyingPercent: number | null;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
}

export interface ApplicationView {
  id: number;
  applicationNo: string;
  fullName: string;
  dateOfBirth: IsoDate;
  age: number;
  minor: boolean;
  email: string;
  phone: string | null;
  programId: number;
  programName: string;
  category: ApplicationForm['category'];
  entranceScore: number | null;
  qualifyingPercent: number | null;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  status: AdmissionStatus;
  statusReason: string | null;
  submittedAt: IsoInstant | null;
  updatedAt: IsoInstant;
  consentStatus: 'NOT_REQUIRED' | 'NOT_REQUESTED' | 'PENDING' | 'GRANTED' | 'REVOKED';
  missingDocuments: DocumentType[];
  allowedActions: AdmissionAction[];
}

export interface ApplicationSummary {
  id: number;
  applicationNo: string;
  fullName: string;
  programName: string;
  category: string;
  entranceScore: number | null;
  qualifyingPercent: number | null;
  status: AdmissionStatus;
  submittedAt: IsoInstant | null;
}

export interface DocumentView {
  id: number;
  type: DocumentType;
  label: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: IsoInstant;
}

export interface ConsentView {
  id: number;
  applicationId: number;
  purpose: string;
  guardianName: string;
  guardianContact: string;
  status: 'PENDING' | 'GRANTED' | 'REVOKED';
  otpExpiresAt: IsoInstant | null;
  grantedAt: IsoInstant | null;
  revokedAt: IsoInstant | null;
  demoOtp: string | null;
}

export interface MeritEntry {
  rank: number;
  applicationId: number;
  applicationNo: string;
  fullName: string;
  category: string;
  entranceScore: number;
  qualifyingPercent: number;
  meritScore: number;
  dateOfBirth: IsoDate;
  allocation: string;
  waitlistNumber: number | null;
  status: AdmissionStatus;
}

export interface MeritList {
  programId: number;
  programName: string;
  totalSeats: number;
  seatMatrix: Record<string, number>;
  seatsFilled: Record<string, number>;
  generatedAt: IsoInstant;
  entries: MeritEntry[];
}

// ---------- Timetable ----------
export interface TimetableEntry {
  id: number;
  day: number;
  period: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  facultyId: number;
  facultyName: string;
  section: string;
  room: string;
  status: 'DRAFT' | 'PUBLISHED';
}

export interface Clash {
  type: 'FACULTY' | 'SECTION' | 'ROOM';
  day: number;
  period: number;
  entryIds: number[];
  description: string;
}

export interface TimetableView {
  programId: number;
  programName: string;
  semester: number;
  section: string;
  draft: TimetableEntry[];
  published: TimetableEntry[];
  clashes: Clash[];
}

export interface FacultyLoad {
  facultyId: number;
  fullName: string;
  hoursPerWeek: number;
  teaching: string[];
}

// ---------- Library ----------
export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  copiesTotal: number;
  copiesAvailable: number;
  campusCode: string;
}

export interface LoanView {
  id: number;
  bookId: number;
  title: string;
  author: string;
  isbn: string;
  usn: string;
  studentName: string;
  issuedOn: IsoDate;
  dueOn: IsoDate;
  returnedOn: IsoDate | null;
  daysLate: number;
  fine: number;
  open: boolean;
}

// ---------- Administration ----------
export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  occurredAt: IsoInstant;
}

export interface OutboxMessage {
  id: number;
  channel: 'EMAIL' | 'SMS';
  recipient: string;
  subject: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  createdAt: IsoInstant;
  sentAt: IsoInstant | null;
}

export interface RoleRule {
  method: string | null;
  pattern: string;
  access: 'PUBLIC' | 'ANY_AUTHENTICATED' | 'ROLES';
  roles: Role[];
}
