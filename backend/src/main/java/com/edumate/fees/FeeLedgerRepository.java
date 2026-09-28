package com.edumate.fees;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for fee ledger lines. */
public interface FeeLedgerRepository extends JpaRepository<FeeLedgerEntry, Long> {

    List<FeeLedgerEntry> findByStudentIdOrderByCreatedAt(Long studentId);

    /** Debits minus credits: what the student still owes (negative = paid in advance). */
    @Query("""
            select coalesce(sum(case when e.entryType = 'DEBIT' then e.amount else -e.amount end), 0)
            from FeeLedgerEntry e where e.studentId = :studentId
            """)
    BigDecimal balance(@Param("studentId") Long studentId);
}
