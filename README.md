<div align="center">

<img src="frontend/public/favicon.svg" width="88" alt="EduMate logo" />

# EduMate

### The whole campus, beautifully in one place.

Admissions · Attendance · Examinations and results · Fees · Timetable · Library<br/>
for every role, on every campus, with every SQA finding fixed and proved by a test.

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

![Tests](https://img.shields.io/badge/tests-98_passing-2ea44f?style=flat-square)
![Themes](https://img.shields.io/badge/themes-light_%7C_dark-8b5cf6?style=flat-square)
![Responsive](https://img.shields.io/badge/responsive-phone_to_desktop-ec4899?style=flat-square)
![Accessibility](https://img.shields.io/badge/a11y-keyboard_%2B_reduced_motion-0ea5e9?style=flat-square)

[**Quick start**](#-quick-start) ·
[**Screenshots**](#-screenshots) ·
[Demo accounts](#-demo-accounts) ·
[SQA traceability](#-where-each-sqa-finding-lives) ·
[Learn the code](#-learn-the-codebase)

<img src="screenshots/hero.png" alt="The EduMate student dashboard, half in the light theme and half in the dark theme" width="100%" />

</div>

## 📖 About

**EduMate** is the code of the education-automation platform that the SQA activity report
*"Automation Software for an Educational Organization"* (Software Quality Assurance, 23CSE701,
Anubhav Kumar, 23BTRCT015) calls **EduAutomate**. It covers admissions, attendance, examinations and results, fees,
timetable, library and the student/parent portal. It is multi-campus, and every defect fix described in the report is
built in and covered by an automated test.

## ✨ Highlights

<table>
<tr>
<td width="33%" valign="top">

<b>🎓 Students and parents</b><br/>
Attendance rings that say how many classes you can still miss, hall-ticket eligibility with the reason for every
course, an SGPA/CGPA trend chart, online fee payment with an instant receipt, and a parent portal.

</td>
<td width="33%" valign="top">

<b>🧑‍🏫 Faculty</b><br/>
A one-tap attendance register ("everyone starts present"), protected by optimistic locking so two teachers can never
overwrite each other, and marks entry where every amendment is audited.

</td>
<td width="33%" valign="top">

<b>📝 Examinations</b><br/>
Compute results, then <b>two different</b> superintendents approve, then publish. Published results cannot change, and
publishing twice is impossible even under concurrent clicks.

</td>
</tr>
<tr>
<td valign="top">

<b>🏫 Admissions</b><br/>
Online applications with scanned documents (checked and fingerprinted with SHA-256), guardian OTP consent for minors,
and a merit list that fills a category-wise seat matrix.

</td>
<td valign="top">

<b>🗓️ Administration</b><br/>
A clash-free timetable generator, an audit log that keeps the old <b>and</b> new value, a message outbox, a
deny-by-default role matrix, and campus-level multi-tenancy (each campus sees only its own students).

</td>
<td valign="top">

<b>🔐 Built to be trusted</b><br/>
bcrypt passwords, signed JWT sessions, account lockout after 5 failures, idempotent HMAC-signed payment callbacks,
a Content-Security-Policy and no stack traces in error messages.

</td>
</tr>
</table>

## 📸 Screenshots

**The public welcome page and sign-in**

<img src="screenshots/welcome.png" alt="Welcome page: headline, call to action and a live product mock" width="100%" />

<table>
<tr>
<td width="50%"><img src="screenshots/welcome-journey.png" alt="Welcome page: the student journey told in scroll-driven steps" /><br/><sub>A scroll-driven "student journey"</sub></td>
<td width="50%"><img src="screenshots/welcome-roles-dark.png" alt="Welcome page in dark mode: a gallery of the roles" /><br/><sub>One app, every role (dark theme)</sub></td>
</tr>
<tr>
<td><img src="screenshots/login.png" alt="Sign-in page with the list of demo accounts" /><br/><sub>Sign-in, with one-click demo accounts</sub></td>
<td><img src="screenshots/command-palette.png" alt="Command palette opened over the dashboard" /><br/><sub>Ctrl K opens the command palette anywhere</sub></td>
</tr>
</table>

**Students**

<table>
<tr>
<td width="50%"><img src="screenshots/attendance.png" alt="Attendance page with a progress ring per course" /><br/><sub>Attendance: exactly 75 % is enough, and the page says so</sub></td>
<td width="50%"><img src="screenshots/results.png" alt="Results page with the grade point trend chart" /><br/><sub>Results: SGPA and CGPA trend with an interactive chart</sub></td>
</tr>
<tr>
<td><img src="screenshots/hall-ticket-dark.png" alt="Hall ticket eligibility in dark mode" /><br/><sub>Hall ticket: the decision and the reason, course by course</sub></td>
<td><img src="screenshots/payment.png" alt="Payment successful page with a duplicate callback ignored" /><br/><sub>Fees: a replayed gateway callback is recognised and ignored</sub></td>
</tr>
</table>

**Staff**

<table>
<tr>
<td width="50%"><img src="screenshots/take-attendance.png" alt="Faculty attendance register with three students marked absent" /><br/><sub>Faculty: tap a student to mark them absent</sub></td>
<td width="50%"><img src="screenshots/results-workflow.png" alt="Results workflow: computed, first approval, second approval, published" /><br/><sub>Examinations: compute → approve → approve → publish</sub></td>
</tr>
<tr>
<td><img src="screenshots/timetable-dark.png" alt="Timetable planning grid in dark mode with no clashes" /><br/><sub>Administration: a generated, clash-free timetable</sub></td>
<td><img src="screenshots/merit-list.png" alt="Merit list with the seat matrix per category" /><br/><sub>Admissions: merit list and seat matrix</sub></td>
</tr>
<tr>
<td><img src="screenshots/application-detail.png" alt="An admission application with its progress and documents" /><br/><sub>Admissions: one application, its progress and documents</sub></td>
<td><img src="screenshots/admin-dashboard-dark.png" alt="Administrator dashboard in dark mode" /><br/><sub>Every role gets its own dashboard</sub></td>
</tr>
</table>

**On a phone**

<img src="screenshots/mobile.png" alt="Four phones: welcome page, dark dashboard, attendance and the navigation drawer" width="100%" />

## 🧱 Architecture

```mermaid
flowchart LR
    U(["Browser<br/>students · parents · staff"]) --> F["Frontend<br/>React 19 + TypeScript<br/>:5173 dev · :3000 Docker"]
    F -- "JSON over HTTP /api/…<br/>JWT bearer token" --> B["Backend<br/>Spring Boot 4.1 · Java 21<br/>:8080"]
    B --> DB[("Database<br/>H2 in memory (dev)<br/>PostgreSQL 17 (Docker)")]
    B --> C[("Cache<br/>in memory (dev)<br/>Redis 7 (Docker)")]
    B --> S[("Object store<br/>scanned documents")]
    B -. "HMAC-signed callbacks" .-> P["Payment gateway<br/>(simulated)"]
    B -. "outbox + dispatcher" .-> N["E-mail / SMS gateway<br/>(logged in dev)"]
```

| Report says | Implemented as |
|---|---|
| React single-page application | `frontend/` – React 19, TypeScript 7, Vite 8, React Router 8 |
| Spring Boot REST backend | `backend/` – Spring Boot 4.1, Java 21 bytecode (runs on JDK 21+) |
| PostgreSQL transactional store | Flyway migration `V1__create_schema.sql`; H2 in PostgreSQL mode for development |
| Redis for cache data | `@Cacheable("publishedResults")`; Redis in the `docker` profile |
| Object store for scanned documents | `ObjectStore` interface + `LocalFileObjectStore` |
| Payment gateway integration | `PaymentOrchestrator`, `GatewaySignature`, `MockPaymentGateway` |
| SMS and e-mail gateway | `NotificationService` → outbox → `NotificationDispatcher` |

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 7, Vite 8, React Router 8 |
| Design system | `styles/theme.css`: OKLCH colours with `light-dark()`, one file for colours, type, spacing, shadows and easing; light, dark and "same as my computer" themes |
| Motion | [motion](https://motion.dev) 13 (page transitions, staggered reveals, springs, count-up numbers, self-drawing charts), [Lenis](https://lenis.darkroom.engineering) smooth scrolling, CSS scroll-driven animations |
| Components | [Radix UI](https://www.radix-ui.com) dialogs, menus and tooltips, [cmdk](https://cmdk.paco.me) command palette, [Sonner](https://sonner.emilkowal.ski) toasts, lucide-react icons, Geist and Instrument Serif fonts bundled locally |
| Backend | Spring Boot 4.1: Web MVC, Security (OAuth2 resource server with JWT), Data JPA, Validation, Cache, Actuator; Flyway migrations |
| Data | H2 in memory (development), PostgreSQL 17 and Redis 7 (Docker) |
| Testing | JUnit 6, MockMvc, Spring Security Test, embedded PostgreSQL 17; Vitest on the frontend |
| Delivery | Docker Compose, nginx serving the built frontend with a strict Content-Security-Policy |

## 🚀 Quick start

You need **JDK 21 or newer** and **Node.js 20.19+ or 22.12+** (required by Vite 8). Nothing else: Maven comes with the
project (`mvnw`) and the database runs in memory.

**Windows, one command:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev-start.ps1
```

**Any system, by hand, in two terminals:**

```bash
cd backend && ./mvnw spring-boot:run          # http://localhost:8080  (API)
cd frontend && npm install && npm run dev      # http://localhost:5173  (open this)
```

The database is recreated with demo data on every backend start. Browse it at
http://localhost:8080/h2-console (JDBC URL `jdbc:h2:mem:edumate`, user `sa`, empty password).
Signed out, http://localhost:5173 shows the welcome page; the login page lists every demo account (double-click one to
sign in). Inside the app, **Ctrl K** opens the command palette.

**Docker, production-like:**

```bash
cp .env.example .env        # then edit the secrets
docker compose up --build   # open http://localhost:3000
```

This starts PostgreSQL 17, Redis 7, the backend and nginx serving the built frontend.

## 🔑 Demo accounts

Every account uses the password **`Edumate@2026`**. Start with `student`, then try `meera.nair` (faculty), `examsup`
(examinations) and `admin`.

<details>
<summary><b>All demo accounts and what each one demonstrates</b></summary>
<br/>

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

</details>

## 🧪 Tests

```bash
cd backend && ./mvnw test     # 64 JUnit tests: unit, integration (MockMvc + H2), PostgreSQL 17
cd frontend && npm test       # 34 Vitest tests: uploads, forms, formatting, visuals, navigation
```

## ✅ Where each SQA finding lives

Each finding of the report, the code that fixes it, and the test that proves the fix.

<details>
<summary><b>Show the traceability table (19 rows)</b></summary>
<br/>

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

</details>

## 📚 Learn the codebase

| Guide | For whom | What is inside |
|---|---|---|
| [`docs/EduMate-Zero-to-Hero.html`](docs/EduMate-Zero-to-Hero.html) | new to programming | every folder, every file and every line of this project explained from first principles, including the Release 3.0 interface (design system, animations, smooth scrolling) |
| [`docs/Spring-Boot-Zero-to-Pioneer.html`](docs/Spring-Boot-Zero-to-Pioneer.html) | know Java, not Spring | a 25-chapter course from "what is a bean?" to auto-configuration, proxies, transactions and native images, taught with this project's real backend code |

Both are single HTML files: open them in a browser after cloning (GitHub shows their source, not the page).
After changing code, regenerate them with `python docs/explainer/build_explainer.py --report` and
`python docs/spring-guide/build_spring_guide.py` (Python 3 + Pygments).

## 🗂️ Project layout

```
backend/     Spring Boot REST API (Java)          frontend/   React single-page app (TypeScript)
  src/main/java/com/edumate/                        src/api/        how the app talks to the backend
    academic/  admissions/  attendance/             src/pages/      one file per screen
    campus/    common/      config/                 src/components/ the app shell and shared pieces
    consent/   dashboard/   documents/              src/motion/     animation presets, smooth scroll, reveals
    exam/      fees/        library/                src/i18n/messages.ts   EVERY piece of on-screen text
    notifications/  security/  timetable/  admin/   src/styles/theme.css   EVERY colour, size and curve
  src/main/resources/db/migration/  database schema
docs/        the zero-to-hero explainer and the     scripts/      start-up helper
             Spring Boot zero-to-pioneer course     screenshots/  the pictures in this README
docker-compose.yml   .env.example
```

## ⚠️ Known limitations

- **Scale:** the report describes a 48,600-line production system. This repository is a working reference
  implementation of its core modules, so it is smaller.
- **TC-013:** the report gives SGPA **8.25** for grades S, A, B, B, C over credits 4, 4, 3, 3, 2. On the 10-point scale
  (S=10, A=9, B=8, C=7) the correct value is 138 ÷ 16 = **8.63**, which is what the code produces.
- **Not implemented:** the university ERP and DigiLocker integrations named in the report.
- **Not split by campus:** the audit log and the message outbox are university-wide. Only university-level
  administrators should hold the ADMIN role.
- **Simulated gateways:** the payment gateway is simulated by `MockPaymentGateway`, and the SMS/e-mail gateway
  only writes to the log (`LoggingNotificationGateway`).

---

<div align="center">

Built by **Anubhav Kumar** (23BTRCT015) for Software Quality Assurance, 23CSE701.<br/>
<sub>If this project helped you, consider giving it a ⭐</sub>

</div>
