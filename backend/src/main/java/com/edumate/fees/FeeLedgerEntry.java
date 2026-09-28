package com.edumate.fees;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One line of a student's fee account book.
 * DEBIT = money the student owes (a bill); CREDIT = money the student paid.
 * Balance owed = total debits - total credits.
 */
@Entity
@Table(name = "fee_ledger_entry")
public class FeeLedgerEntry {

    public static final String DEBIT = "DEBIT";
    public static final String CREDIT = "CREDIT";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "entry_type", nullable = false)
    private String entryType;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String description;

    /** For a CREDIT: the bank transaction reference. UNIQUE per entry type, so it can be credited only once. */
    @Column(nullable = false)
    private String reference;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected FeeLedgerEntry() {
        // required by JPA
    }

    public FeeLedgerEntry(Long studentId, String entryType, BigDecimal amount, String description,
                          String reference, Instant createdAt) {
        this.studentId = studentId;
        this.entryType = entryType;
        this.amount = amount;
        this.description = description;
        this.reference = reference;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public String getEntryType() {
        return entryType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }

    public String getReference() {
        return reference;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
