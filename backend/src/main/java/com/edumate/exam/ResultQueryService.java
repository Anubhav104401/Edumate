package com.edumate.exam;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Course;
import com.edumate.academic.CourseRepository;

/**
 * Reads a student's PUBLISHED results. Unpublished (draft, computed, approved) results are
 * never returned here, whatever the student tries.
 *
 * @Cacheable keeps each student's answer in the cache (Redis in production), so on results
 * morning, when thousands of students press refresh, most requests never reach the database
 * (NFR-01, "caching layer"). Publishing clears the cache (see ResultPublicationService.publish).
 */
@Service
public class ResultQueryService {

    private final StudentResultRepository studentResults;
    private final CourseGradeRepository courseGrades;
    private final CourseRepository courses;

    public ResultQueryService(StudentResultRepository studentResults, CourseGradeRepository courseGrades,
                              CourseRepository courses) {
        this.studentResults = studentResults;
        this.courseGrades = courseGrades;
        this.courses = courses;
    }

    @Cacheable(cacheNames = "publishedResults", key = "#studentId")
    @Transactional(readOnly = true)
    public List<SemesterResult> publishedFor(Long studentId) {
        List<PublishedRow> rows = studentResults.findPublishedForStudent(studentId, ResultStatus.PUBLISHED);
        Map<Long, List<CourseGrade>> gradesByResult = courseGrades
                .findByStudentResultIdIn(rows.stream().map(PublishedRow::studentResultId).toList()).stream()
                .collect(Collectors.groupingBy(CourseGrade::getStudentResultId));
        Map<Long, Course> courseById = courses.findAllById(gradesByResult.values().stream()
                        .flatMap(List::stream).map(CourseGrade::getCourseId).distinct().toList())
                .stream().collect(Collectors.toMap(Course::getId, Function.identity()));

        return rows.stream()
                .map(row -> new SemesterResult(row.semester(), row.examSessionCode(), row.examSessionName(),
                        row.sgpa(), row.cgpa(), row.creditsRegistered(), row.creditsEarned(), row.outcome(),
                        row.publishedAt(),
                        gradesByResult.getOrDefault(row.studentResultId(), List.of()).stream()
                                .map(g -> {
                                    Course c = courseById.get(g.getCourseId());
                                    return new CourseLine(c.getCode(), c.getName(), g.getCredits(),
                                            g.getTotalMarks(), g.getGrade(), g.getGradePoint());
                                })
                                .toList()))
                .toList();
    }

    /** One published semester. Serializable so it can be stored in Redis. */
    public record SemesterResult(int semester, String examSessionCode, String examSessionName, BigDecimal sgpa,
                                 BigDecimal cgpa, int creditsRegistered, int creditsEarned, String outcome,
                                 Instant publishedAt, List<CourseLine> courses) implements Serializable {
    }

    public record CourseLine(String courseCode, String courseName, int credits, BigDecimal totalMarks,
                             String grade, int gradePoint) implements Serializable {
    }
}
