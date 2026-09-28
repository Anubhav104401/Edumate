package com.edumate.fees;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The student fee account book (design element "FeeLedger", FR-08).
 * Lines are only ever added, never edited or deleted, so the history can always be audited.
 */
@Service
public class FeeLedger {

    private final FeeLedgerRepository entries;
    private final Clock clock;

    public FeeLedger(FeeLedgerRepository entries, Clock clock) {
        this.entries = entries;
        this.clock = clock;
    }

    @Transactional
    public FeeLedgerEntry debit(Long studentId, BigDecimal amount, String description, String reference) {
        return entries.save(new FeeLedgerEntry(studentId, FeeLedgerEntry.DEBIT, amount, description, reference,
                Instant.now(clock)));
    }

    @Transactional
    public FeeLedgerEntry credit(Long studentId, BigDecimal amount, String description, String reference) {
        return entries.save(new FeeLedgerEntry(studentId, FeeLedgerEntry.CREDIT, amount, description, reference,
                Instant.now(clock)));
    }

    /** What the student still owes. Zero or less means "fee fully paid". */
    @Transactional(readOnly = true)
    public BigDecimal outstanding(Long studentId) {
        return entries.balance(studentId);
    }

    @Transactional(readOnly = true)
    public boolean isFullyPaid(Long studentId) {
        return outstanding(studentId).signum() <= 0;
    }

    @Transactional(readOnly = true)
    public List<FeeLedgerEntry> statement(Long studentId) {
        return entries.findByStudentIdOrderByCreatedAt(studentId);
    }
}
