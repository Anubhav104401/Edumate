package com.edumate.exam;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
 * Internal-assessment marks entry and amendment (design element "MarksEntryService", FR-17).
 *
 * Every amendment writes an audit record with the OLD value, the NEW value, who changed it,
 * when and why. The old design stored only the new value, so a disputed mark could not be
 * traced back (design defect DR-04, test defect DEF-022).
 */
@Service
public class MarksEntryService {

    private final MarkRepository marks;
    private final StudentRepository students;
    private final ResultSetRepository resultSets;
    private final CourseAccess courseAccess;
    private final AuditLogger auditLogger;
    private final Clock clock;

    public MarksEntryService(MarkRepository marks, StudentRepository students, ResultSetRepository resultSets,
                             CourseAccess courseAccess, AuditLogger auditLogger, Clock clock) {
        this.marks = marks;
        this.students = students;
        this.resultSets = resultSets;
        this.courseAccess = courseAccess;
        this.auditLogger = auditLogger;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public MarksSheet sheet(CurrentUser me, Long courseId, Long examSessionId) {
        Course course = courseAccess.requireTaughtBy(courseId, me);
        Map<Long, Student> byId = students.findByProgramIdAndSemesterOrderByUsn(
                        course.getProgramId(), course.getSemester()).stream()
                .collect(Collectors.toMap(Student::getId, Function.identity()));
        boolean locked = resultSets.findByExamSessionIdAndProgramIdAndSemester(
                        examSessionId, course.getProgramId(), course.getSemester())
                .map(ResultSet::isLockedForMarkChanges).orElse(false);

        List<MarkLine> lines = marks.findByCourseIdAndExamSessionId(courseId, examSessionId).stream()
                .filter(m -> byId.containsKey(m.getStudentId()))
                .map(m -> toLine(m, byId.get(m.getStudentId())))
                .sorted((a, b) -> a.usn().compareTo(b.usn()))
                .toList();
        return new MarksSheet(course.getId(), course.getCode(), course.getName(), examSessionId, locked, lines);
    }

    @Transactional
    public MarkLine amendInternal(CurrentUser me, Long markId, AmendRequest request) {
        Mark mark = marks.findById(markId).orElseThrow(() -> ApiException.notFound("Mark"));
        Course course = courseAccess.requireTaughtBy(mark.getCourseId(), me);
        if (request.version() != mark.getVersion()) {
            throw ApiException.conflict("STALE_UPDATE",
                    "This mark was changed by someone else after you opened the sheet. Reload and try again.");
        }
        ResultSet set = resultSets.findByExamSessionIdAndProgramIdAndSemester(
                mark.getExamSessionId(), course.getProgramId(), course.getSemester()).orElse(null);
        if (set != null && set.isLockedForMarkChanges()) {
            throw ApiException.conflict("RESULTS_LOCKED",
                    "Results for this course are approved or published; marks can no longer be changed here.");
        }

        BigDecimal oldValue = mark.getInternalMarks();
        BigDecimal newValue = request.internalMarks().setScale(2, RoundingMode.HALF_UP);
        Student student = students.findById(mark.getStudentId()).orElseThrow(() -> ApiException.notFound("Student"));
        if (oldValue != null && oldValue.compareTo(newValue) == 0) {
            return toLine(mark, student);
        }

        mark.amendInternal(newValue, me.username(), Instant.now(clock));
        marks.flush();
        auditLogger.record(me.username(), "MARK_AMENDED", "Mark", mark.getId(),
                "internal=" + oldValue,
                "internal=" + newValue + " (" + student.getUsn() + ", " + course.getCode() + "; reason: "
                        + request.reason().trim() + ")");
        if (set != null && set.getStatus() == ResultStatus.COMPUTED) {
            set.invalidate();   // computed numbers are now out of date and must be recomputed
        }
        return toLine(mark, student);
    }

    private static MarkLine toLine(Mark mark, Student student) {
        BigDecimal internal = mark.getInternalMarks();
        BigDecimal external = mark.effectiveExternal();
        BigDecimal total = internal != null && external != null ? internal.add(external) : null;
        String grade = total != null ? SgpaCalculator.grade(internal, external).name() : null;
        return new MarkLine(mark.getId(), mark.getVersion(), student.getId(), student.getUsn(),
                student.getFullName(), internal, external, mark.getRevaluedExternalMarks() != null, total, grade,
                mark.getUpdatedBy(), mark.getUpdatedAt());
    }

    public record MarksSheet(Long courseId, String courseCode, String courseName, Long examSessionId,
                             boolean locked, List<MarkLine> lines) {
    }

    public record MarkLine(Long markId, long version, Long studentId, String usn, String fullName,
                           BigDecimal internalMarks, BigDecimal externalMarks, boolean revalued,
                           BigDecimal total, String grade, String updatedBy, Instant updatedAt) {
    }

    /** What the "Save" button of one mark row sends. */
    public record AmendRequest(
            @NotNull(message = "Enter the internal marks.")
            @DecimalMin(value = "0", message = "Internal marks cannot be negative.")
            @DecimalMax(value = "40", message = "Internal marks cannot exceed 40.")
            BigDecimal internalMarks,
            @NotNull Long version,
            @NotBlank(message = "Give a reason for the change.") @Size(max = 200) String reason) {
    }
}
