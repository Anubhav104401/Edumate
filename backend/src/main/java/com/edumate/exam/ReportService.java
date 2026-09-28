package com.edumate.exam;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Course;
import com.edumate.academic.CourseRepository;
import com.edumate.academic.Program;
import com.edumate.academic.ProgramRepository;
import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.attendance.AttendanceSummaryService;
import com.edumate.common.ApiException;
import com.edumate.security.CurrentUser;

/**
 * The two cohort-wide reports. Both contain every student's data, which is why RoleMatrix limits
 * them to EXAM_SUPERINTENDENT and ADMIN (the fix for DEF-031, where any logged-in student could
 * download the whole cohort's marks).
 */
@Service
@Transactional(readOnly = true)
public class ReportService {

    private final ResultSetRepository resultSets;
    private final StudentResultRepository studentResults;
    private final CourseGradeRepository courseGrades;
    private final StudentRepository students;
    private final CourseRepository courses;
    private final ProgramRepository programs;
    private final AttendanceSummaryService attendance;
    private final ResultPublicationService publication;

    public ReportService(ResultSetRepository resultSets, StudentResultRepository studentResults,
                         CourseGradeRepository courseGrades, StudentRepository students, CourseRepository courses,
                         ProgramRepository programs, AttendanceSummaryService attendance,
                         ResultPublicationService publication) {
        this.resultSets = resultSets;
        this.studentResults = studentResults;
        this.courseGrades = courseGrades;
        this.students = students;
        this.courses = courses;
        this.programs = programs;
        this.attendance = attendance;
        this.publication = publication;
    }

    public ConsolidatedReport consolidatedMarks(Long resultSetId, CurrentUser me) {
        ResultSet set = resultSets.findById(resultSetId).orElseThrow(() -> ApiException.notFound("Result set"));
        requireSameCampus(set.getProgramId(), me);

        List<Course> semesterCourses = courses.findByProgramIdAndSemesterOrderByCode(set.getProgramId(),
                set.getSemester());
        List<StudentResult> results = studentResults.findByResultSetIdOrderByStudentId(resultSetId);
        Map<Long, List<CourseGrade>> gradesByResult = courseGrades
                .findByStudentResultIdIn(results.stream().map(StudentResult::getId).toList()).stream()
                .collect(Collectors.groupingBy(CourseGrade::getStudentResultId));
        Map<Long, Student> studentById = students.findAllById(results.stream().map(StudentResult::getStudentId)
                .toList()).stream().collect(Collectors.toMap(Student::getId, Function.identity()));
        Map<Long, String> codeById = semesterCourses.stream()
                .collect(Collectors.toMap(Course::getId, Course::getCode));

        List<ReportRow> rows = new ArrayList<>();
        for (StudentResult result : results) {
            Student student = studentById.get(result.getStudentId());
            Map<String, String> grades = new LinkedHashMap<>();
            for (CourseGrade grade : gradesByResult.getOrDefault(result.getId(), List.of())) {
                grades.put(codeById.get(grade.getCourseId()), grade.getGrade() + " (" + grade.getTotalMarks() + ")");
            }
            rows.add(new ReportRow(student.getUsn(), student.getFullName(), grades, result.getSgpa(),
                    result.getCgpa(), result.getCreditsEarned(), result.getCreditsRegistered(), result.getOutcome()));
        }
        rows.sort(Comparator.comparing(ReportRow::usn));
        return new ConsolidatedReport(publication.view(set), semesterCourses.stream().map(Course::getCode).toList(),
                rows);
    }

    /** Converts the report into CSV text for Excel. */
    public String toCsv(ConsolidatedReport report) {
        StringBuilder csv = new StringBuilder();
        List<String> header = new ArrayList<>(List.of("USN", "Name"));
        header.addAll(report.courseCodes());
        header.addAll(List.of("SGPA", "CGPA", "Credits earned", "Credits registered", "Outcome"));
        csv.append(String.join(",", header.stream().map(ReportService::cell).toList())).append("\r\n");
        for (ReportRow row : report.rows()) {
            List<String> cells = new ArrayList<>(List.of(row.usn(), row.fullName()));
            report.courseCodes().forEach(code -> cells.add(row.grades().getOrDefault(code, "")));
            cells.addAll(List.of(row.sgpa().toPlainString(), row.cgpa().toPlainString(),
                    String.valueOf(row.creditsEarned()), String.valueOf(row.creditsRegistered()), row.outcome()));
            csv.append(String.join(",", cells.stream().map(ReportService::cell).toList())).append("\r\n");
        }
        return csv.toString();
    }

    /** Every course of a programme semester with the students below the attendance threshold. */
    public List<CourseShortfall> attendanceShortfall(Long programId, int semester, String section, CurrentUser me) {
        requireSameCampus(programId, me);
        return courses.findByProgramIdAndSemesterOrderByCode(programId, semester).stream()
                .map(c -> new CourseShortfall(c.getId(), c.getCode(), c.getName(),
                        attendance.shortfall(c.getId(), section, null)))
                .toList();
    }

    /**
     * Quotes a CSV cell, and defuses "formula injection": a cell starting with = + - or @ would be
     * run as a formula by Excel, so a leading apostrophe is added.
     */
    static String cell(String value) {
        String safe = value == null ? "" : value;
        if (!safe.isEmpty() && "=+-@".indexOf(safe.charAt(0)) >= 0) {
            safe = "'" + safe;
        }
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private void requireSameCampus(Long programId, CurrentUser me) {
        Program program = programs.findById(programId).orElseThrow(() -> ApiException.notFound("Programme"));
        if (!program.getCampusCode().equals(me.campusCode())) {
            throw ApiException.forbidden("This programme belongs to another campus.");
        }
    }

    public record ConsolidatedReport(ResultSetView resultSet, List<String> courseCodes, List<ReportRow> rows) {
    }

    public record ReportRow(String usn, String fullName, Map<String, String> grades, BigDecimal sgpa,
                            BigDecimal cgpa, int creditsEarned, int creditsRegistered, String outcome) {
    }

    public record CourseShortfall(Long courseId, String courseCode, String courseName,
                                  List<AttendanceSummaryService.StudentAttendance> students) {
    }
}
