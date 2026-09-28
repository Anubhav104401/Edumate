package com.edumate.exam;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * The marks of one student in one course for one exam session.
 * internal = continuous internal assessment (out of 40),
 * external = semester-end examination (out of 60).
 * The database allows only one such row per (student, course, session) — fix for DR-05.
 */
@Entity
@Table(name = "mark")
public class Mark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "exam_session_id", nullable = false)
    private Long examSessionId;

    @Column(name = "internal_marks")
    private BigDecimal internalMarks;

    @Column(name = "external_marks")
    private BigDecimal externalMarks;

    /** After revaluation this value replaces externalMarks everywhere (fix for RR-08). */
    @Column(name = "revalued_external_marks")
    private BigDecimal revaluedExternalMarks;

    @Version
    private long version;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Mark() {
        // required by JPA
    }

    public Mark(Long studentId, Long courseId, Long examSessionId, BigDecimal internalMarks,
                BigDecimal externalMarks, String updatedBy, Instant updatedAt) {
        this.studentId = studentId;
        this.courseId = courseId;
        this.examSessionId = examSessionId;
        this.internalMarks = internalMarks;
        this.externalMarks = externalMarks;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
    }

    /** The external mark that counts: the revalued one if revaluation happened. */
    public BigDecimal effectiveExternal() {
        return revaluedExternalMarks != null ? revaluedExternalMarks : externalMarks;
    }

    public void amendInternal(BigDecimal newValue, String actor, Instant when) {
        this.internalMarks = newValue;
        this.updatedBy = actor;
        this.updatedAt = when;
    }

    public void setRevaluedExternalMarks(BigDecimal revaluedExternalMarks) {
        this.revaluedExternalMarks = revaluedExternalMarks;
    }

    public Long getId() {
        return id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public Long getExamSessionId() {
        return examSessionId;
    }

    public BigDecimal getInternalMarks() {
        return internalMarks;
    }

    public BigDecimal getExternalMarks() {
        return externalMarks;
    }

    public BigDecimal getRevaluedExternalMarks() {
        return revaluedExternalMarks;
    }

    public long getVersion() {
        return version;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
