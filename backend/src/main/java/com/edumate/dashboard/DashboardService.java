package com.edumate.dashboard;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.CourseRepository;
import com.edumate.academic.StudentRepository;
import com.edumate.admissions.AdmissionService;
import com.edumate.admissions.AdmissionStatus;
import com.edumate.attendance.AttendanceSummaryService;
import com.edumate.common.ApiException;
import com.edumate.exam.HallTicketService;
import com.edumate.exam.ResultQueryService;
import com.edumate.exam.ResultSetRepository;
import com.edumate.exam.ResultStatus;
import com.edumate.fees.FeeLedger;
import com.edumate.fees.Payment;
import com.edumate.fees.PaymentRepository;
import com.edumate.library.LibraryService;
import com.edumate.notifications.NotificationMessage;
import com.edumate.notifications.NotificationRepository;
import com.edumate.security.CurrentUser;
import com.edumate.timetable.TimetableService;

/**
 * Builds the home-page cards for whoever is logged in. Each role sees the few numbers that matter
 * to its daily work; every card links to the page where the number can be acted on.
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final AttendanceSummaryService attendance;
    private final FeeLedger feeLedger;
    private final HallTicketService hallTickets;
    private final ResultQueryService results;
    private final LibraryService library;
    private final CourseRepository courses;
    private final StudentRepository students;
    private final TimetableService timetable;
    private final ResultSetRepository resultSets;
    private final AdmissionService admissions;
    private final PaymentRepository payments;
    private final NotificationRepository notifications;
    private final Clock clock;

    public DashboardService(AttendanceSummaryService attendance, FeeLedger feeLedger, HallTicketService hallTickets,
                            ResultQueryService results, LibraryService library, CourseRepository courses,
                            StudentRepository students,
                            TimetableService timetable, ResultSetRepository resultSets, AdmissionService admissions,
                            PaymentRepository payments, NotificationRepository notifications, Clock clock) {
        this.attendance = attendance;
        this.feeLedger = feeLedger;
        this.hallTickets = hallTickets;
        this.results = results;
        this.library = library;
        this.courses = courses;
        this.students = students;
        this.timetable = timetable;
        this.resultSets = resultSets;
        this.admissions = admissions;
        this.payments = payments;
        this.notifications = notifications;
        this.clock = clock;
    }

    public List<Card> cardsFor(CurrentUser me) {
        return switch (me.role()) {
            case STUDENT, GUARDIAN -> studentCards(me.requireStudentId());
            case FACULTY -> facultyCards(me);
            case EXAM_SUPERINTENDENT -> examCards();
            case ADMISSIONS_OFFICER -> admissionCards(me);
            case ACCOUNTS_OFFICER -> accountsCards();
            case LIBRARIAN -> libraryCards(me);
            case APPLICANT -> applicantCards(me);
            case ADMIN -> adminCards(me);
        };
    }

    private List<Card> studentCards(Long studentId) {
        List<Card> cards = new ArrayList<>();
        List<AttendanceSummaryService.CourseAttendance> rows = attendance.forStudent(studentId);
        long shortfall = rows.stream().filter(r -> !r.meetsThreshold()).count();
        rows.stream().filter(r -> r.percent() != null).min(Comparator.comparing(r -> r.percent()))
                .ifPresent(low -> cards.add(new Card("attendance", "Lowest attendance",
                        low.percent() + "%", low.courseName(), shortfall > 0 ? "bad" : "good", "/attendance")));
        cards.add(new Card("shortfall", "Courses below 75%", String.valueOf(shortfall),
                shortfall > 0 ? "Attend every class to recover" : "All courses on track",
                shortfall > 0 ? "bad" : "good", "/attendance"));

        BigDecimal due = feeLedger.outstanding(studentId);
        cards.add(new Card("fees", "Fee outstanding", due.signum() > 0 ? "Rs " + due.toPlainString() : "Nil",
                due.signum() > 0 ? "Pay before the due date" : "Fully paid", due.signum() > 0 ? "warn" : "good",
                "/fees"));

        try {
            HallTicketService.HallTicket ticket = hallTickets.forStudent(studentId);
            cards.add(new Card("hallTicket", "Hall ticket", ticket.issued() ? "Eligible" : "Not yet",
                    ticket.examSessionName(), ticket.issued() ? "good" : "warn", "/hall-ticket"));
        } catch (ApiException ignored) {
            // no exam session yet: simply no card
        }

        List<ResultQueryService.SemesterResult> published = results.publishedFor(studentId);
        if (published.isEmpty()) {
            cards.add(new Card("results", "Latest result", "Not published", "", "neutral", "/results"));
        } else {
            ResultQueryService.SemesterResult last = published.get(published.size() - 1);
            cards.add(new Card("results", "CGPA", last.cgpa().toPlainString(),
                    "Semester " + last.semester() + " SGPA " + last.sgpa(), "good", "/results"));
        }

        List<LibraryService.LoanView> loans = library.loansOf(studentId).stream()
                .filter(LibraryService.LoanView::open).toList();
        BigDecimal fines = loans.stream().map(LibraryService.LoanView::fine).reduce(BigDecimal.ZERO, BigDecimal::add);
        cards.add(new Card("library", "Books borrowed", String.valueOf(loans.size()),
                fines.signum() > 0 ? "Fine so far: Rs " + fines : "No fines", fines.signum() > 0 ? "warn" : "neutral",
                "/library"));
        return cards;
    }

    private List<Card> facultyCards(CurrentUser me) {
        List<Card> cards = new ArrayList<>();
        var mine = courses.findByFacultyIdOrderByCode(me.id());
        cards.add(new Card("courses", "Courses you teach", String.valueOf(mine.size()),
                mine.stream().map(c -> c.getCode()).collect(Collectors.joining(", ")), "neutral", "/attendance/take"));
        long below = mine.stream()
                .mapToLong(c -> students.findSections(c.getProgramId(), c.getSemester()).stream()
                        .mapToLong(section -> attendance.shortfall(c.getId(), section, null).size()).sum())
                .sum();
        cards.add(new Card("shortfall", "Students below 75%", String.valueOf(below), "Across your courses",
                below > 0 ? "warn" : "good", "/attendance/course"));
        int today = LocalDate.now(clock).getDayOfWeek().getValue();
        long lecturesToday = timetable.mine(me).stream().filter(e -> e.day() == today).count();
        cards.add(new Card("today", "Lectures today", String.valueOf(lecturesToday), "From the published timetable",
                "neutral", "/timetable"));
        return cards;
    }

    private List<Card> examCards() {
        Map<ResultStatus, Long> byStatus = resultSets.findAllByOrderByIdDesc().stream()
                .collect(Collectors.groupingBy(r -> r.getStatus(), Collectors.counting()));
        long waiting = byStatus.getOrDefault(ResultStatus.COMPUTED, 0L)
                + byStatus.getOrDefault(ResultStatus.AWAITING_SECOND_APPROVAL, 0L);
        return List.of(
                new Card("awaiting", "Waiting for approval", String.valueOf(waiting), "Two approvals needed each",
                        waiting > 0 ? "warn" : "neutral", "/results/manage"),
                new Card("approved", "Approved, not published",
                        String.valueOf(byStatus.getOrDefault(ResultStatus.APPROVED, 0L)), "", "neutral",
                        "/results/manage"),
                new Card("published", "Published result sets",
                        String.valueOf(byStatus.getOrDefault(ResultStatus.PUBLISHED, 0L)), "", "good",
                        "/results/manage"));
    }

    private List<Card> admissionCards(CurrentUser me) {
        Map<AdmissionStatus, Long> byStatus = admissions.list(me, null, null).stream()
                .collect(Collectors.groupingBy(AdmissionService.ApplicationSummary::status, Collectors.counting()));
        return List.of(
                new Card("submitted", "New (submitted)", String.valueOf(byStatus.getOrDefault(AdmissionStatus.SUBMITTED, 0L)),
                        "Start review", "warn", "/admissions"),
                new Card("review", "Under review", String.valueOf(byStatus.getOrDefault(AdmissionStatus.UNDER_REVIEW, 0L)),
                        "", "neutral", "/admissions"),
                new Card("shortlisted", "Shortlisted", String.valueOf(byStatus.getOrDefault(AdmissionStatus.SHORTLISTED, 0L)),
                        "", "neutral", "/admissions"),
                new Card("enrolled", "Enrolled", String.valueOf(byStatus.getOrDefault(AdmissionStatus.ENROLLED, 0L)),
                        "", "good", "/admissions"));
    }

    private List<Card> accountsCards() {
        List<Payment> recent = payments.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 500));
        BigDecimal collected = recent.stream().filter(Payment::isSuccessful).map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long failed = recent.stream().filter(p -> Payment.FAILED.equals(p.getStatus())).count();
        long pending = recent.stream().filter(p -> Payment.INITIATED.equals(p.getStatus())).count();
        return List.of(
                new Card("collected", "Collected (recent)", "Rs " + collected.toPlainString(), "Successful payments",
                        "good", "/fees/payments"),
                new Card("failed", "Failed payments", String.valueOf(failed), "Declined by the bank",
                        failed > 0 ? "warn" : "neutral", "/fees/payments"),
                new Card("pending", "Awaiting gateway", String.valueOf(pending), "Started but not completed",
                        "neutral", "/fees/payments"));
    }

    private List<Card> libraryCards(CurrentUser me) {
        List<LibraryService.LoanView> open = library.openLoans(me);
        long overdue = open.stream().filter(l -> l.daysLate() > 0).count();
        return List.of(
                new Card("open", "Books on loan", String.valueOf(open.size()), "", "neutral", "/library/desk"),
                new Card("overdue", "Overdue", String.valueOf(overdue), "Fines are accruing",
                        overdue > 0 ? "warn" : "good", "/library/desk"));
    }

    private List<Card> applicantCards(CurrentUser me) {
        try {
            AdmissionService.ApplicationView app = admissions.myApplication(me);
            List<Card> cards = new ArrayList<>();
            cards.add(new Card("status", "Application status", app.status().name(), app.applicationNo(),
                    app.status() == AdmissionStatus.REJECTED ? "bad" : "neutral", "/apply"));
            cards.add(new Card("documents", "Documents missing", String.valueOf(app.missingDocuments().size()),
                    app.missingDocuments().isEmpty() ? "All required documents uploaded" : "Upload them to submit",
                    app.missingDocuments().isEmpty() ? "good" : "warn", "/apply"));
            if (app.minor()) {
                cards.add(new Card("consent", "Guardian consent", app.consentStatus(), "Required: you are under 18",
                        "GRANTED".equals(app.consentStatus()) ? "good" : "warn", "/apply"));
            }
            return cards;
        } catch (ApiException notStarted) {
            return List.of(new Card("status", "Application", "Not started", "Start your application", "warn",
                    "/apply"));
        }
    }

    private List<Card> adminCards(CurrentUser me) {
        long pending = notifications.findByStatusOrderByCreatedAt(NotificationMessage.PENDING, PageRequest.of(0, 1000))
                .size();
        long teachers = timetable.workload(me).size();
        return List.of(
                new Card("outbox", "Messages waiting to send", String.valueOf(pending), "E-mail / SMS outbox",
                        "neutral", "/admin/outbox"),
                new Card("faculty", "Teachers", String.valueOf(teachers), "See weekly workload", "neutral",
                        "/timetable/manage"),
                new Card("audit", "Audit trail", "Open", "Who changed what, and when", "neutral", "/admin/audit"));
    }

    /** One tile on the home page. tone decides its colour: good, warn, bad or neutral. */
    public record Card(String key, String label, String value, String hint, String tone, String link) {
    }
}
