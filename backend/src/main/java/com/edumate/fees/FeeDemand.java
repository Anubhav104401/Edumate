package com.edumate.fees;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A bill raised on a student, e.g. "Semester 5 tuition fee, Rs 62,500, due 15 Oct". */
@Entity
@Table(name = "fee_demand")
public class FeeDemand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected FeeDemand() {
        // required by JPA
    }

    public FeeDemand(Long studentId, String description, BigDecimal amount, LocalDate dueDate, Instant createdAt) {
        this.studentId = studentId;
        this.description = description;
        this.amount = amount;
        this.dueDate = dueDate;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
