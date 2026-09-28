# EduMate

**EduMate** is the code of the education-automation platform that the SQA activity report
*"Automation Software for an Educational Organization"* (Software Quality Assurance, 23CSE701,
Anubhav Kumar, 23BTRCT015) calls **EduAutomate**. It covers admissions, attendance, examinations
and results, fees, timetable, library and the student/parent portal. It is multi-campus, and every
defect fix described in the report is built in and covered by an automated test.

> **New to programming?** Open [`docs/EduMate-Zero-to-Hero.html`](docs/EduMate-Zero-to-Hero.html) in a browser.
> It explains every folder, every file and every line of this project from first principles, including a chapter on
> the Release 3.0 interface (design system, animations, smooth scrolling).
> After changing code, regenerate it with `python docs/explainer/build_explainer.py --report` (Python 3 + Pygments).
>
> **Know Java but not Spring?** Open [`docs/Spring-Boot-Zero-to-Pioneer.html`](docs/Spring-Boot-Zero-to-Pioneer.html):
> a 25-chapter course from "what is a bean?" to auto-configuration, proxies, transactions and native images, taught
> with this project's real backend code. Rebuild it with `python docs/spring-guide/build_spring_guide.py`.

---

## 1. Architecture

```
 Browser ──► Frontend (React + TypeScript, port 5173 in dev / 3000 in Docker)
               │   every request: JSON over HTTP to /api/...
               ▼
            Backend (Spring Boot 4, Java, port 8080)
               ├─► Database: H2 in memory (dev)  or  PostgreSQL 17 (Docker)
               ├─► Cache:    in-memory (dev)      or  Redis 7 (Docker)
               ├─► Object store for scanned documents (./storage folder)
               ├─► Payment gateway (simulated, HMAC-signed callbacks)
               └─► E-mail / SMS gateway (outbox table + dispatcher; logs in dev)
```

| Report says | Implemented as |
|---|---|
| React single-page application | `frontend/` – React 19, TypeScript 7, Vite 8, React Router 8 (see "The interface" below) |
| Spring Boot REST backend | `backend/` – Spring Boot 4.1, Java 21 bytecode (runs on JDK 21+) |
| PostgreSQL transactional store | Flyway migration `V1__create_schema.sql`; H2 in PostgreSQL mode for development |
| Redis for cache data | `@Cacheable("publishedResults")`; Redis in the `docker` profile |
| Object store for scanned documents | `ObjectStore` interface + `LocalFileObjectStore` |
| Payment gateway integration | `PaymentOrchestrator`, `GatewaySignature`, `MockPaymentGateway` |
| SMS and e-mail gateway | `NotificationService` → outbox → `NotificationDispatcher` |

### The interface (Release 3.0)

Every screen was redesigned around a small design system and a consistent motion language, while keeping the strict
Content-Security-Policy, keyboard access and "reduce motion" support.

| Concern | Library / technique |
|---|---|
| Design tokens, light and dark themes | `styles/theme.css`: OKLCH colours with `light-dark()`, one file for colours, type, spacing, shadows, easing |
| Animation | [motion](https://motion.dev) 13: page transitions, staggered reveals, shared-layout menu highlight, springs, count-up numbers, self-drawing charts |
| Smooth scrolling and scroll effects | [Lenis](https://lenis.darkroom.engineering) 1.3, motion's `useScroll`, CSS scroll-driven animations (`animation-timeline: view()`) |
| Accessible primitives | [Radix UI](https://www.radix-ui.com) (dialogs, menus, tooltips), [cmdk](https://cmdk.paco.me) command palette (Ctrl K), [Sonner](https://sonner.emilkowal.ski) toasts |
| Icons and type | lucide-react; Geist, Geist Mono and Instrument Serif bundled with Fontsource (no third-party requests) |
| Extras | a public welcome page (`/welcome`), skeleton loading, a request progress bar, SVG progress rings and an SGPA/CGPA trend chart, confetti after payment |

## 2. Run it (development, Windows)

You need **JDK 21 or newer** and **Node.js 20 or newer**. Nothing else: Maven comes with the project (`mvnw`) and the
database runs in memory.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev-start.ps1
```

or by hand, in two terminals:

```bash
cd backend && ./mvnw spring-boot:run          # http://localhost:8080  (API)
cd frontend && npm install && npm run dev      # http://localhost:5173  (open this)
```

The database is recreated with demo data on every backend start. Browse it at
http://localhost:8080/h2-console (JDBC URL `jdbc:h2:mem:edumate`, user `sa`, empty password).
Signed out, http://localhost:5173 shows the welcome page; the login page lists every demo account (double-click one to
sign in). Inside the app, **Ctrl K** opens the command palette.

### Demo accounts (password for all: `Edumate@2026`)

| Username | Who | Good for demonstrating |
|---|---|---|
| `student` | Aarav Sharma, B.Tech CSE sem 5 | exactly 75.00 % in Operating Systems (TC-009/DEF-019); fee unpaid → pay with replayed callback (TC-005/TC-006); SGPA 8.63 after publication (TC-013) |
| `student2` | Ishaan Verma | attendance shortfall, medical exemption, overdue fee: rules R2/R4 |
| `guardian` | Aarav's parent | parent portal |
| `kavya.rao`, `arjun.shetty`, `meera.nair`, `vikram.das`, `sneha.kulkarni` | Faculty | attendance with optimistic locking (DR-01), marks amendment with audit (TC-012) |
| `examsup`, `examsup2` | Exam superintendents | compute → two-person approval → publish (Safety objective, DEF-027) |
| `admissions` | Admissions officer | application review, merit list with seat matrix (FR-05) |
| `accounts` | Accounts officer | payments and ledgers |
| `librarian` | Librarian | issue/return, fines |
| `applicant` | Priya Nair, adult | application, scanned-document upload |
| `applicant.minor` | Rohan Gupta, 17 | guardian OTP consent before submission (RR-02/TC-020) |
| `admin` | Administrator | timetable generation and clash detection (TC-011), audit log, outbox, role matrix |
| `ccc.admin` | Administrator of City Campus | multi-tenancy: sees none of Jain Global Campus's students |

## 3. Run it (Docker, production-like)

```bash
cp .env.example .env        # then edit the secrets
docker compose up --build   # open http://localhost:3000
```

This starts PostgreSQL 17, Redis 7, the backend and nginx serving the built frontend.

## 4. Tests

```bash
cd backend && ./mvnw test     # 64 JUnit tests: unit, integration (MockMvc + H2) and PostgreSQL 17 compatibility
cd frontend && npm test       # 33 Vitest tests: upload checks, form validation, formatting, visuals, navigation
```

## 5. Where each SQA finding lives in the code

| Finding in the report | Fix in code | Proved by |
|---|---|---|
| RR-01 75 % vs 80 % threshold | one value, `edumate.academic.attendance-threshold-percent: 75` | `EligibilityEvaluatorTest` |
| RR-02 no guardian consent for minors | `ConsentRegistry` (OTP to guardian), submit guard in `AdmissionService` | `AdmissionConsentIntegrationTest` (TC-020) |
| RR-04 / DEF-019 boundary at exactly 75 % | inclusive `>=` and exact integer comparison in `AttendanceMath` | `EligibilityEvaluatorTest` (TC-008/009/010) |
| RR-07 Exam Superintendent rights undefined | `Role.EXAM_SUPERINTENDENT` rows in `RoleMatrix` | `RoleMatrixCoverageTest` |
| RR-08 revaluation must supersede | `Mark.effectiveExternal()` | `SgpaCalculatorTest` |
| DR-01 no locking on attendance | `@Version` + version check in `AttendanceCaptureService` | `AttendanceConcurrencyIntegrationTest` |
| DR-02 / DEF-014 callback not idempotent | row lock + duplicate check + UNIQUE `gateway_txn_ref` in `PaymentOrchestrator` | `PaymentIntegrationTest` (TC-006) |
| DR-03 N+1 in result computation | one cohort query `MarkRepository.findRowsForCohort` | `ResultPublicationIntegrationTest` |
| DR-04 / DEF-022 audit lost prior value | `AuditLogger` stores old and new value | smoke test / `MarksEntryService` |
| DR-05 duplicate mark rows | `UNIQUE (student_id, course_id, exam_session_id)` | schema |
| DR-06 / DEF-031 report endpoints open | deny-by-default `RoleMatrix` | `SecurityIntegrationTest` (TC-017), `RoleMatrixCoverageTest` |
| DR-07 cannot reverse enrolment | `ENROLLED → ENROLMENT_REVERSED` in `AdmissionStateMachine` | `AdmissionStateMachineTest` |
| DR-08 computation also sends messages | outbox + `NotificationDispatcher` | design |
| DEF-027 double publication | atomic `UPDATE … WHERE status = 'APPROVED'` | `ResultPublicationIntegrationTest` (TC-015) |
| DEF-036 reflected XSS | React escapes text; CSP header in `nginx.conf` | design |
| A02 password storage (tested in Table 3.13, no finding) | bcrypt cost 12, kept | `SecurityConfig` |
| A05 stack traces in errors | `GlobalExceptionHandler`, `include-stacktrace: never` | `SecurityIntegrationTest` |
| A07 no account lockout | `LoginAttemptService` (5 failures → 15 min) | `SecurityIntegrationTest` |
| Recommendation 1: SGPA complexity 19 | `SgpaCalculator` split into methods of complexity ≤ 3 | `SgpaCalculatorTest` |

## 6. Known limitations (be ready to say these)

- **Scale:** the report describes a 48,600-line production system. This repository is a working reference
  implementation of its core modules, so it is smaller.
- **TC-013:** the report gives SGPA **8.25** for grades S, A, B, B, C over credits 4, 4, 3, 3, 2. On the 10-point scale
  (S=10, A=9, B=8, C=7) the correct value is 138 ÷ 16 = **8.63**, which is what the code produces.
- **Not implemented:** the university ERP and DigiLocker integrations named in the report.
- **Not split by campus:** the audit log and the message outbox are university-wide. Only university-level
  administrators should hold the ADMIN role.
- **Simulated gateways:** the payment gateway is simulated by `MockPaymentGateway`, and the SMS/e-mail gateway
  only writes to the log (`LoggingNotificationGateway`).

## 7. Project layout

```
backend/     Spring Boot REST API (Java)          frontend/   React single-page app (TypeScript)
  src/main/java/com/edumate/                        src/api/        how the app talks to the backend
    academic/  admissions/  attendance/             src/pages/      one file per screen
    campus/    common/      config/                 src/components/ the app shell and shared pieces
    consent/   dashboard/   documents/              src/motion/     animation presets, smooth scroll, reveals
    exam/      fees/        library/                src/i18n/messages.ts   EVERY piece of on-screen text
    notifications/  security/  timetable/  admin/   src/styles/theme.css   EVERY colour, size and curve
  src/main/resources/db/migration/  database schema
docs/        the zero-to-hero explainer and the     scripts/    start-up helper
             Spring Boot zero-to-pioneer course
docker-compose.yml   .env.example
```
