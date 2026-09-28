package com.edumate.exam;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** The grade a student got in one course, stored as part of their StudentResult. */
@Entity
@Table(name = "course_grade")
public class CourseGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_result_id", nullable = false)
    private Long studentResultId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "total_marks", nullable = false)
    private BigDecimal totalMarks;

    @Column(nullable = false)
    private String grade;

    @Column(name = "grade_point", nullable = false)
    private int gradePoint;

    @Column(nullable = false)
    private int credits;

    protected CourseGrade() {
        // required by JPA
    }

    public CourseGrade(Long studentResultId, Long courseId, BigDecimal totalMarks, String grade,
                       int gradePoint, int credits) {
        this.studentResultId = studentResultId;
        this.courseId = courseId;
        this.totalMarks = totalMarks;
        this.grade = grade;
        this.gradePoint = gradePoint;
        this.credits = credits;
    }

    public Long getId() {
        return id;
    }

    public Long getStudentResultId() {
        return studentResultId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public BigDecimal getTotalMarks() {
        return totalMarks;
    }

    public String getGrade() {
        return grade;
    }

    public int getGradePoint() {
        return gradePoint;
    }

    public int getCredits() {
        return credits;
    }
}
