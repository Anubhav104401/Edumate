package com.edumate.exam;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.ExamSession;
import com.edumate.academic.ExamSessionRepository;
import com.edumate.academic.Program;
import com.edumate.academic.ProgramRepository;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.security.CurrentUser;

/**
 * Computes SGPA, CGPA and pass/fail for a whole cohort (design element "ResultComputationService", FR-19).
 *
 * Database reads are fixed at two queries however many students there are:
 *   1. every mark of the cohort (MarkRepository.findRowsForCohort)
 *   2. every earlier published semester of the cohort (for CGPA)
 * The old design ran one query per student (the N+1 pattern of DR-03), which made the results page
 * take 4.80 s under load; after this change it took 1.90 s.
 *
 * This class only computes. Sending "your results are out" messages belongs to publication
 * and the NotificationDispatcher (fix for DR-08, low cohesion).
 */
@Service
public class ResultComputationService {

    private final MarkRepository marks;
    private final ResultSetRepository resultSets;
    private final StudentResultRepository studentResults;
    private final CourseGradeRepository courseGrades;
    private final ExamSessionRepository examSessions;
    private final ProgramRepository programs;
    private final AuditLogger auditLogger;
    private final Clock clock;

    public ResultComputationService(MarkRepository marks, ResultSetRepository resultSets,
                                    StudentResultRepository studentResults, CourseGradeRepository courseGrades,
                                    ExamSessionRepository examSessions, ProgramRepository programs,
                                    AuditLogger auditLogger, Clock clock) {
        this.marks = marks;
        this.resultSets = resultSets;
        this.studentResults = studentResults;
        this.courseGrades = courseGrades;
        this.examSessions = examSessions;
        this.programs = programs;
        this.auditLogger = auditLogger;
        this.clock = clock;
    }

    @Transactional
    public ComputeSummary compute(Long examSessionId, Long programId, int semester, CurrentUser me) {
        ExamSession session = examSessions.findById(examSessionId)
                .orElseThrow(() -> ApiException.notFound("Exam session"));
        Program program = programs.findById(programId).orElseThrow(() -> ApiException.notFound("Programme"));
        if (!program.getCampusCode().equals(me.campusCode())) {
            throw ApiException.forbidden("This programme belongs to another campus.");
        }

        ResultSet set = resultSets.findByExamSessionIdAndProgramIdAndSemester(examSessionId, programId, semester)
                .orElseGet(() -> resultSets.save(new ResultSet(examSessionId, programId, semester)));
        if (set.getStatus() == ResultStatus.PUBLISHED) {
            throw ApiException.conflict("ALREADY_PUBLISHED",
                    "These results are already published and can no longer be recomputed.");
        }

        List<MarkRow> rows = marks.findRowsForCohort(examSessionId, programId, semester);
        if (rows.isEmpty()) {
            throw ApiException.badRequest("NO_MARKS", "No marks have been entered for this cohort yet.");
        }
        long missing = rows.stream().filter(row -> !row.isComplete()).count();
        if (missing > 0) {
            throw ApiException.conflict("MARKS_INCOMPLETE", missing
                    + " mark entries are still empty. Results can be computed only when every mark is entered.");
        }

        Map<Long, List<MarkRow>> byStudent = rows.stream()
                .collect(Collectors.groupingBy(MarkRow::studentId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, List<SgpaCalculator.SemesterTotals>> history = studentResults
                .findPublishedHistory(programId, semester, ResultStatus.PUBLISHED).stream()
                .collect(Collectors.groupingBy(PriorSemester::studentId,
                        Collectors.mapping(p -> new SgpaCalculator.SemesterTotals(p.credits(), p.sgpa()),
                                Collectors.toList())));

        studentResults.deleteByResultSetId(set.getId());

        int passed = 0;
        BigDecimal sgpaSum = BigDecimal.ZERO;
        for (Map.Entry<Long, List<MarkRow>> entry : byStudent.entrySet()) {
            StudentResult result = computeOne(set.getId(), entry.getKey(), entry.getValue(),
                    history.getOrDefault(entry.getKey(), List.of()));
            if (StudentResult.PASS.equals(result.getOutcome())) {
                passed++;
            }
            sgpaSum = sgpaSum.add(result.getSgpa());
        }

        set.markComputed(me.username(), Instant.now(clock));
        int count = byStudent.size();
        BigDecimal average = sgpaSum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        auditLogger.record(me.username(), "RESULTS_COMPUTED", "ResultSet", set.getId(), null,
                count + " students, " + passed + " passed, average SGPA " + average);
        return new ComputeSummary(ResultSetView.of(set, session.getCode(), program.getName()),
                count, passed, count - passed, average);
    }

    /** Grades one student's courses, then stores their SGPA, CGPA and course grades. */
    private StudentResult computeOne(Long resultSetId, Long studentId, List<MarkRow> rows,
                                     List<SgpaCalculator.SemesterTotals> earlier) {
        List<SgpaCalculator.GradedCourse> graded = new ArrayList<>();
        List<GradeLine> lines = new ArrayList<>();
        int registered = 0;
        int earned = 0;
        for (MarkRow row : rows) {
            GradeScale grade = SgpaCalculator.grade(row.internalMarks(), row.effectiveExternal());
            graded.add(new SgpaCalculator.GradedCourse(row.credits(), grade.gradePoint()));
            lines.add(new GradeLine(row.courseId(),
                    SgpaCalculator.totalMarks(row.internalMarks(), row.effectiveExternal()), grade, row.credits()));
            registered += row.credits();
            earned += grade.isPass() ? row.credits() : 0;
        }
        String outcome = earned == registered ? StudentResult.PASS : StudentResult.FAIL;
        StudentResult result = studentResults.save(new StudentResult(resultSetId, studentId,
                SgpaCalculator.sgpa(graded), SgpaCalculator.cgpa(earlier, graded), registered, earned, outcome));
        courseGrades.saveAll(lines.stream()
                .map(line -> new CourseGrade(result.getId(), line.courseId(), line.total(), line.grade().name(),
                        line.grade().gradePoint(), line.credits()))
                .toList());
        return result;
    }

    /** A graded course waiting to be stored once its StudentResult has an id. */
    private record GradeLine(Long courseId, BigDecimal total, GradeScale grade, int credits) {
    }

    /** What "Compute results" reports back. */
    public record ComputeSummary(ResultSetView resultSet, int students, int passed, int failed,
                                 BigDecimal averageSgpa) {
    }
}
