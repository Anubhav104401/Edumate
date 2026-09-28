package com.edumate.attendance;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Course;
import com.edumate.academic.CourseAccess;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.security.CurrentUser;

/**
 * Faculty take and correct attendance here (design element "AttendanceCaptureService", FR-11).
 *
 * Concurrency protection (fix for DR-01) works in two layers:
 *  1. The browser sends back the version number it loaded. If the sheet has moved on since,
 *     the save is refused with 409 STALE_UPDATE before anything is written.
 *  2. If two saves pass that check at the very same instant, the database update
 *     "... WHERE version = n" succeeds for only one of them; the other gets the same 409.
 */
@Service
public class AttendanceCaptureService {

    private final AttendanceSessionRepository sessions;
    private final AttendanceRecordRepository records;
    private final StudentRepository students;
    private final CourseAccess courseAccess;
    private final AuditLogger auditLogger;
    private final ShortfallNotifier shortfallNotifier;
    private final Clock clock;

    public AttendanceCaptureService(AttendanceSessionRepository sessions, AttendanceRecordRepository records,
                                    StudentRepository students, CourseAccess courseAccess,
                                    AuditLogger auditLogger, ShortfallNotifier shortfallNotifier, Clock clock) {
        this.sessions = sessions;
        this.records = records;
        this.students = students;
        this.courseAccess = courseAccess;
        this.auditLogger = auditLogger;
        this.shortfallNotifier = shortfallNotifier;
        this.clock = clock;
    }

    /** Opens the register for one class: the saved marks if it was taken, otherwise everyone present. */
    @Transactional(readOnly = true)
    public AttendanceSheet loadSheet(CurrentUser me, Long courseId, String section, LocalDate date, int period) {
        Course course = courseAccess.requireTaughtBy(courseId, me);
        return buildSheet(course, section, date, period);
    }

    @Transactional
    public AttendanceSheet saveSheet(CurrentUser me, SaveSheetRequest request) {
        Course course = courseAccess.requireTaughtBy(request.courseId(), me);
        if (request.date().isAfter(LocalDate.now(clock))) {
            throw ApiException.badRequest("FUTURE_DATE", "Attendance cannot be recorded for a future date.");
        }
        Map<Long, Student> roster = roster(course, request.section()).stream()
                .collect(Collectors.toMap(Student::getId, Function.identity()));
        for (MarkEntry mark : request.marks()) {
            if (!roster.containsKey(mark.studentId())) {
                throw ApiException.badRequest("NOT_IN_SECTION", "A student in the list does not belong to this section.");
            }
        }

        Instant now = Instant.now(clock);
        Optional<AttendanceSession> existing = sessions.findByCourseIdAndSectionAndSessionDateAndPeriod(
                course.getId(), request.section(), request.date(), request.period());

        AttendanceSession session;
        Map<Long, AttendanceRecord> current;
        String action;
        if (existing.isEmpty()) {
            session = sessions.save(new AttendanceSession(course.getId(), request.section(), request.date(),
                    request.period(), me.id(), now));
            current = Map.of();
            action = "ATTENDANCE_TAKEN";
        } else {
            session = existing.get();
            if (request.version() == null || request.version() != session.getVersion()) {
                throw ApiException.conflict("STALE_UPDATE",
                        "Another teacher saved this attendance sheet after you opened it. Reload to see their changes.");
            }
            session.touch(me.id(), now);
            current = records.findBySessionId(session.getId()).stream()
                    .collect(Collectors.toMap(AttendanceRecord::getStudentId, Function.identity()));
            action = "ATTENDANCE_UPDATED";
        }

        List<String> before = new ArrayList<>();
        List<String> after = new ArrayList<>();
        for (MarkEntry mark : request.marks()) {
            AttendanceRecord record = current.get(mark.studentId());
            String usn = roster.get(mark.studentId()).getUsn();
            if (record == null) {
                records.save(new AttendanceRecord(session.getId(), mark.studentId(), mark.present()));
            } else if (record.isPresent() != mark.present()) {
                before.add(usn + "=" + (record.isPresent() ? "P" : "A"));
                after.add(usn + "=" + (mark.present() ? "P" : "A"));
                record.setPresent(mark.present());
            }
        }
        sessions.flush();   // sends the UPDATE now, so a lost race is detected inside this request

        long presentCount = request.marks().stream().filter(MarkEntry::present).count();
        auditLogger.record(me.username(), action, "AttendanceSession", session.getId(),
                before.isEmpty() ? null : String.join(", ", before),
                after.isEmpty() ? presentCount + "/" + request.marks().size() + " present" : String.join(", ", after));

        shortfallNotifier.notifySection(course, request.section());
        return buildSheet(course, request.section(), request.date(), request.period());
    }

    private AttendanceSheet buildSheet(Course course, String section, LocalDate date, int period) {
        List<Student> roster = roster(course, section);
        Optional<AttendanceSession> existing = sessions.findByCourseIdAndSectionAndSessionDateAndPeriod(
                course.getId(), section, date, period);
        Map<Long, Boolean> marks = existing
                .map(s -> records.findBySessionId(s.getId()).stream()
                        .collect(Collectors.toMap(AttendanceRecord::getStudentId, AttendanceRecord::isPresent)))
                .orElse(Map.of());
        List<SheetRow> rows = roster.stream()
                .map(st -> new SheetRow(st.getId(), st.getUsn(), st.getFullName(), marks.getOrDefault(st.getId(), true)))
                .toList();
        return new AttendanceSheet(
                existing.map(AttendanceSession::getId).orElse(null),
                existing.map(AttendanceSession::getVersion).orElse(null),
                course.getId(), course.getCode(), course.getName(), section, date, period,
                existing.isPresent(), rows);
    }

    private List<Student> roster(Course course, String section) {
        List<Student> roster = students.findByProgramIdAndSemesterAndSectionOrderByUsn(
                course.getProgramId(), course.getSemester(), section);
        if (roster.isEmpty()) {
            throw ApiException.notFound("Section " + section);
        }
        return roster;
    }

    /** The register as shown on screen. version is null until the sheet is first saved. */
    public record AttendanceSheet(Long sessionId, Long version, Long courseId, String courseCode, String courseName,
                                  String section, LocalDate date, int period, boolean alreadyTaken,
                                  List<SheetRow> rows) {
    }

    public record SheetRow(Long studentId, String usn, String fullName, boolean present) {
    }

    /** What the "Save attendance" button sends. */
    public record SaveSheetRequest(
            @NotNull Long courseId,
            @NotBlank @Size(max = 10) String section,
            @NotNull LocalDate date,
            @Min(1) @Max(6) int period,
            Long version,
            @NotEmpty @Valid List<MarkEntry> marks) {
    }

    public record MarkEntry(@NotNull Long studentId, boolean present) {
    }
}
