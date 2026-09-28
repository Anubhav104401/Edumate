package com.edumate.attendance;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Course;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.notifications.NotificationService;

/**
 * Queues an e-mail to the guardian of every student below the attendance threshold
 * in a course section (FR-31, design element "NotificationDispatcher" does the sending).
 * The dedup key contains the ISO week, so a guardian hears about a course at most once a week.
 */
@Component
public class ShortfallNotifier {

    private final AttendanceSummaryService summaryService;
    private final StudentRepository students;
    private final NotificationService notifications;
    private final Clock clock;

    public ShortfallNotifier(AttendanceSummaryService summaryService, StudentRepository students,
                             NotificationService notifications, Clock clock) {
        this.summaryService = summaryService;
        this.students = students;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional
    public NotifyResult notifySection(Course course, String section) {
        List<AttendanceSummaryService.StudentAttendance> below = summaryService.shortfall(course.getId(), section, null);
        Map<Long, Student> byId = students.findByProgramIdAndSemesterAndSectionOrderByUsn(
                        course.getProgramId(), course.getSemester(), section).stream()
                .collect(Collectors.toMap(Student::getId, Function.identity()));

        LocalDate today = LocalDate.now(clock);
        String week = today.get(IsoFields.WEEK_BASED_YEAR) + "-W" + today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        List<String> queuedFor = new ArrayList<>();
        int alreadyNotified = 0;

        for (AttendanceSummaryService.StudentAttendance row : below) {
            Student student = byId.get(row.studentId());
            String subject = "Attendance shortfall: " + student.getFullName() + " in " + course.getCode();
            String body = "Dear " + nameOrGuardian(student) + ", attendance of " + student.getFullName()
                    + " (" + student.getUsn() + ") in " + course.getName() + " is " + row.percent()
                    + "% (" + row.attended() + " of " + row.held() + " classes), below the required minimum. "
                    + "Please contact the class teacher.";
            String dedupKey = "shortfall:" + student.getId() + ":" + course.getId() + ":" + week;
            boolean queued = notifications.enqueue(NotificationService.EMAIL, student.getGuardianEmail(),
                    subject, body, dedupKey);
            if (queued) {
                queuedFor.add(student.getUsn());
            } else {
                alreadyNotified++;
            }
        }
        return new NotifyResult(below.size(), queuedFor.size(), alreadyNotified, queuedFor);
    }

    private static String nameOrGuardian(Student student) {
        return student.getGuardianName() == null ? "Parent/Guardian" : student.getGuardianName();
    }

    /** belowThreshold = students found short; queued = new e-mails; alreadyNotified = skipped duplicates. */
    public record NotifyResult(int belowThreshold, int queued, int alreadyNotified, List<String> queuedFor) {
    }
}
