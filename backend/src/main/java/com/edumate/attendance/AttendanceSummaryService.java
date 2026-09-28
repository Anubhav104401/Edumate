package com.edumate.attendance;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Course;
import com.edumate.academic.CourseRepository;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.common.ApiException;
import com.edumate.config.AppProperties;

/**
 * Turns raw present/absent marks into percentages, "classes you can still miss" and
 * shortfall lists. Every method uses a fixed, small number of queries, whatever the class size.
 */
@Service
@Transactional(readOnly = true)
public class AttendanceSummaryService {

    private final AttendanceRecordRepository records;
    private final MedicalExemptionRepository exemptions;
    private final StudentRepository students;
    private final CourseRepository courses;
    private final AppProperties properties;

    public AttendanceSummaryService(AttendanceRecordRepository records, MedicalExemptionRepository exemptions,
                                    StudentRepository students, CourseRepository courses,
                                    AppProperties properties) {
        this.records = records;
        this.exemptions = exemptions;
        this.students = students;
        this.courses = courses;
        this.properties = properties;
    }

    /** One student's attendance in every course of their current semester. */
    public List<CourseAttendance> forStudent(Long studentId) {
        Student student = students.findById(studentId).orElseThrow(() -> ApiException.notFound("Student"));
        List<Course> semesterCourses =
                courses.findByProgramIdAndSemesterOrderByCode(student.getProgramId(), student.getSemester());
        Map<Long, AttendanceCount> counts = records.countByCourseForStudent(studentId).stream()
                .collect(Collectors.toMap(AttendanceCount::key, Function.identity()));
        Set<Long> exempt = exemptions.findByStudentIdAndApprovedTrue(studentId).stream()
                .map(MedicalExemption::getCourseId)
                .collect(Collectors.toSet());

        return semesterCourses.stream()
                .map(course -> toCourseAttendance(course, counts.get(course.getId()), exempt.contains(course.getId())))
                .toList();
    }

    /** Every student of a course section with their attendance. */
    public List<StudentAttendance> forCourse(Long courseId, String section) {
        Course course = courses.findById(courseId).orElseThrow(() -> ApiException.notFound("Course"));
        Map<Long, AttendanceCount> counts = records.countByStudentForCourse(courseId, section).stream()
                .collect(Collectors.toMap(AttendanceCount::key, Function.identity()));
        int threshold = properties.academic().attendanceThresholdPercent();

        return students.findByProgramIdAndSemesterAndSectionOrderByUsn(
                        course.getProgramId(), course.getSemester(), section).stream()
                .map(student -> {
                    AttendanceCount count = counts.get(student.getId());
                    long held = count == null ? 0 : count.held();
                    long attended = count == null ? 0 : count.attended();
                    return new StudentAttendance(student.getId(), student.getUsn(), student.getFullName(),
                            held, attended, AttendanceMath.percent(attended, held),
                            AttendanceMath.meetsThreshold(attended, held, threshold));
                })
                .toList();
    }

    /** Students of a course section strictly below a threshold (75% unless another is asked for). */
    public List<StudentAttendance> shortfall(Long courseId, String section, Integer thresholdPercent) {
        int threshold = thresholdPercent == null ? properties.academic().attendanceThresholdPercent() : thresholdPercent;
        if (threshold < 1 || threshold > 100) {
            throw ApiException.badRequest("INVALID_THRESHOLD", "Threshold must be between 1 and 100.");
        }
        return forCourse(courseId, section).stream()
                .filter(row -> row.held() > 0 && !AttendanceMath.meetsThreshold(row.attended(), row.held(), threshold))
                .toList();
    }

    public long plannedTotal(Course course) {
        return (long) course.getWeeklyHours() * properties.academic().weeksPerSemester();
    }

    private CourseAttendance toCourseAttendance(Course course, AttendanceCount count, boolean exempt) {
        int threshold = properties.academic().attendanceThresholdPercent();
        long held = count == null ? 0 : count.held();
        long attended = count == null ? 0 : count.attended();
        long planned = plannedTotal(course);
        boolean meets = AttendanceMath.meetsThreshold(attended, held, threshold);
        long canMiss = AttendanceMath.classesCanMiss(attended, held, planned, threshold);

        String status;
        if (!meets) {
            status = "SHORTFALL";
        } else if (canMiss <= 2) {
            status = "WARNING";
        } else {
            status = "OK";
        }
        return new CourseAttendance(course.getId(), course.getCode(), course.getName(), held, attended,
                AttendanceMath.percent(attended, held), meets, exempt, planned, canMiss,
                AttendanceMath.maxAchievablePercent(attended, held, planned), status);
    }

    /** One row of "my attendance". canMiss < 0 means the threshold can no longer be reached. */
    public record CourseAttendance(Long courseId, String courseCode, String courseName, long held, long attended,
                                   BigDecimal percent, boolean meetsThreshold, boolean medicalExemption,
                                   long plannedTotal, long canMiss, BigDecimal maxAchievablePercent,
                                   String status) {
    }

    /** One row of a course's attendance register. */
    public record StudentAttendance(Long studentId, String usn, String fullName, long held, long attended,
                                    BigDecimal percent, boolean meetsThreshold) {
    }
}
