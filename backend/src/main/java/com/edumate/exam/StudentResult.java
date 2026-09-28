package com.edumate.exam;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One student's computed SGPA, CGPA and pass/fail inside a result set. */
@Entity
@Table(name = "student_result")
public class StudentResult {

    public static final String PASS = "PASS";
    public static final String FAIL = "FAIL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "result_set_id", nullable = false)
    private Long resultSetId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private BigDecimal sgpa;

    @Column(nullable = false)
    private BigDecimal cgpa;

    @Column(name = "credits_registered", nullable = false)
    private int creditsRegistered;

    @Column(name = "credits_earned", nullable = false)
    private int creditsEarned;

    @Column(nullable = false)
    private String outcome;

    protected StudentResult() {
        // required by JPA
    }

    public StudentResult(Long resultSetId, Long studentId, BigDecimal sgpa, BigDecimal cgpa,
                         int creditsRegistered, int creditsEarned, String outcome) {
        this.resultSetId = resultSetId;
        this.studentId = studentId;
        this.sgpa = sgpa;
        this.cgpa = cgpa;
        this.creditsRegistered = creditsRegistered;
        this.creditsEarned = creditsEarned;
        this.outcome = outcome;
    }

    public Long getId() {
        return id;
    }

    public Long getResultSetId() {
        return resultSetId;
    }

    public Long getStudentId() {
        return studentId;
    }

    public BigDecimal getSgpa() {
        return sgpa;
    }

    public BigDecimal getCgpa() {
        return cgpa;
    }

    public int getCreditsRegistered() {
        return creditsRegistered;
    }

    public int getCreditsEarned() {
        return creditsEarned;
    }

    public String getOutcome() {
        return outcome;
    }
}
