package com.edumate.attendance;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An approved medical exemption lets a student sit an exam despite an attendance shortfall (rule R2). */
@Entity
@Table(name = "medical_exemption")
public class MedicalExemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    private boolean approved;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected MedicalExemption() {
        // required by JPA
    }

    public MedicalExemption(Long studentId, Long courseId, String reason, boolean approved,
                            String approvedBy, Instant createdAt) {
        this.studentId = studentId;
        this.courseId = courseId;
        this.reason = reason;
        this.approved = approved;
        this.approvedBy = approvedBy;
        this.createdAt = createdAt;
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

    public String getReason() {
        return reason;
    }

    public boolean isApproved() {
        return approved;
    }

    public String getApprovedBy() {
        return approvedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
