package com.edumate.exam;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.ExamSession;
import com.edumate.academic.ExamSessionRepository;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.attendance.AttendanceSummaryService;
import com.edumate.attendance.EligibilityEvaluator;
import com.edumate.common.ApiException;
import com.edumate.fees.FeeLedger;

/**
 * Answers "may this student sit the exams, course by course?" by collecting the four inputs of the
 * eligibility decision table (attendance, fees, internal assessment, medical exemption) and handing
 * them to the EligibilityEvaluator.
 */
@Service
@Transactional(readOnly = true)
public class HallTicketService {

    private final StudentRepository students;
    private final ExamSessionRepository examSessions;
    private final AttendanceSummaryService attendance;
    private final FeeLedger feeLedger;
    private final MarkRepository marks;
    private final EligibilityEvaluator evaluator;

    public HallTicketService(StudentRepository students, ExamSessionRepository examSessions,
                             AttendanceSummaryService attendance, FeeLedger feeLedger, MarkRepository marks,
                             EligibilityEvaluator evaluator) {
        this.students = students;
        this.examSessions = examSessions;
        this.attendance = attendance;
        this.feeLedger = feeLedger;
        this.marks = marks;
        this.evaluator = evaluator;
    }

    public HallTicket forStudent(Long studentId) {
        Student student = students.findById(studentId).orElseThrow(() -> ApiException.notFound("Student"));
        ExamSession session = examSessions.findByCampusCodeOrderByStartsOnDesc(student.getCampusCode()).stream()
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Current exam session"));
        boolean feePaid = feeLedger.isFullyPaid(studentId);
        Map<Long, Boolean> assessmentDone = marks.findByStudentIdAndExamSessionId(studentId, session.getId()).stream()
                .collect(Collectors.toMap(Mark::getCourseId, m -> m.getInternalMarks() != null));

        List<CourseEligibility> courses = attendance.forStudent(studentId).stream()
                .map(a -> {
                    boolean ia = assessmentDone.getOrDefault(a.courseId(), false);
                    EligibilityEvaluator.Decision d =
                            evaluator.decide(a.meetsThreshold(), feePaid, ia, a.medicalExemption());
                    return new CourseEligibility(a.courseId(), a.courseCode(), a.courseName(), a.percent(),
                            a.meetsThreshold(), a.medicalExemption(), ia, d.eligible(), d.rule(), d.reasons());
                })
                .toList();
        boolean allEligible = !courses.isEmpty() && courses.stream().allMatch(CourseEligibility::eligible);
        return new HallTicket(student.getId(), student.getUsn(), student.getFullName(), session.getCode(),
                session.getName(), session.getStartsOn(), evaluator.getThresholdPercent(), feePaid, allEligible,
                courses);
    }

    public record HallTicket(Long studentId, String usn, String fullName, String examSessionCode,
                             String examSessionName, LocalDate examsStartOn, int thresholdPercent, boolean feePaid,
                             boolean issued, List<CourseEligibility> courses) {
    }

    public record CourseEligibility(Long courseId, String courseCode, String courseName, BigDecimal attendancePercent,
                                    boolean attendanceOk, boolean medicalExemption, boolean assessmentComplete,
                                    boolean eligible, String rule, List<String> reasons) {
    }
}
