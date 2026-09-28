package com.edumate.common.audit;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reads and writes rows of the audit_log table. Spring writes the SQL for us from the method names. */
public interface AuditRepository extends JpaRepository<AuditEntry, Long> {

    List<AuditEntry> findByEntityTypeAndEntityIdOrderByOccurredAtDesc(String entityType, String entityId);

    List<AuditEntry> findAllByOrderByOccurredAtDesc(Pageable pageable);
}
