package com.edumate.exam;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.ExamSessionRepository;
import com.edumate.academic.ProgramRepository;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.notifications.NotificationService;
import com.edumate.security.CurrentUser;

/**
 * The two-person gate in front of result publication (the "Safety" objective, QR-1 mitigation).
 *
 *   approve #1  COMPUTED -> AWAITING_SECOND_APPROVAL      (person A)
 *   approve #2  AWAITING_SECOND_APPROVAL -> APPROVED      (person B, must not be A)
 *   publish     APPROVED -> PUBLISHED                     (one atomic statement, see DEF-027)
 */
@Service
public class ResultPublicationService {

    private final ResultSetRepository resultSets;
    private final StudentResultRepository studentResults;
    private final StudentRepository students;
    private final ExamSessionRepository examSessions;
    private final ProgramRepository programs;
    private final NotificationService notifications;
    private final AuditLogger auditLogger;
    private final Clock clock;

    public ResultPublicationService(ResultSetRepository resultSets, StudentResultRepository studentResults,
                                    StudentRepository students, ExamSessionRepository examSessions,
                                    ProgramRepository programs, NotificationService notifications,
                                    AuditLogger auditLogger, Clock clock) {
        this.resultSets = resultSets;
        this.studentResults = studentResults;
        this.students = students;
        this.examSessions = examSessions;
        this.programs = programs;
        this.notifications = notifications;
        this.auditLogger = auditLogger;
        this.clock = clock;
    }

    @Transactional
    public ResultSetView approve(Long resultSetId, CurrentUser me) {
        ResultSet set = find(resultSetId);
        Instant now = Instant.now(clock);
        switch (set.getStatus()) {
            case COMPUTED -> set.recordFirstApproval(me.username(), now);
            case AWAITING_SECOND_APPROVAL -> {
                if (me.username().equals(set.getFirstApprover())) {
                    throw ApiException.conflict("SAME_APPROVER",
                            "You gave the first approval. A second, different exam superintendent must approve.");
                }
                set.recordSecondApproval(me.username(), now);
            }
            default -> throw ApiException.conflict("NOT_AWAITING_APPROVAL",
                    "Only computed results can be approved. Current status: " + set.getStatus() + ".");
        }
        resultSets.flush();
        auditLogger.record(me.username(), "RESULTS_APPROVED", "ResultSet", set.getId(), null,
                set.getStatus().name());
        return view(set);
    }

    @Transactional
    @CacheEvict(cacheNames = "publishedResults", allEntries = true)
    public ResultSetView publish(Long resultSetId, CurrentUser me) {
        Instant now = Instant.now(clock);
        int changed = resultSets.publishIfApproved(resultSetId, me.username(), now,
                ResultStatus.APPROVED, ResultStatus.PUBLISHED);
        ResultSet set = find(resultSetId);
        if (changed == 0) {
            if (set.getStatus() == ResultStatus.PUBLISHED) {
                throw ApiException.conflict("ALREADY_PUBLISHED",
                        "These results were already published by " + set.getPublishedBy() + ".");
            }
            throw ApiException.conflict("NOT_APPROVED",
                    "Results can be published only after two different people have approved them.");
        }

        List<StudentResult> results = studentResults.findByResultSetIdOrderByStudentId(resultSetId);
        Map<Long, Student> byId = students.findAllById(results.stream().map(StudentResult::getStudentId).toList())
                .stream().collect(Collectors.toMap(Student::getId, Function.identity()));
        for (StudentResult result : results) {
            Student student = byId.get(result.getStudentId());
            notifications.enqueue(NotificationService.EMAIL, student.getEmail(),
                    "Semester " + set.getSemester() + " results published",
                    "Dear " + student.getFullName() + ", your results are now available on the EduMate portal. "
                            + "SGPA: " + result.getSgpa() + ", CGPA: " + result.getCgpa() + ".",
                    "result:" + resultSetId + ":" + student.getId());
        }
        auditLogger.record(me.username(), "RESULTS_PUBLISHED", "ResultSet", resultSetId, "APPROVED",
                "PUBLISHED to " + results.size() + " students");
        return view(set);
    }

    @Transactional(readOnly = true)
    public List<ResultSetView> list() {
        return resultSets.findAllByOrderByIdDesc().stream().map(this::view).toList();
    }

    ResultSetView view(ResultSet set) {
        String session = examSessions.findById(set.getExamSessionId()).map(s -> s.getCode()).orElse("?");
        String program = programs.findById(set.getProgramId()).map(p -> p.getName()).orElse("?");
        return ResultSetView.of(set, session, program);
    }

    private ResultSet find(Long id) {
        return resultSets.findById(id).orElseThrow(() -> ApiException.notFound("Result set"));
    }
}
