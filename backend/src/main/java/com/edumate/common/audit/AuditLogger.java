package com.edumate.common.audit;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The single place that writes audit records (design element "AuditLogger" in the RTM).
 * It runs inside the caller's transaction: if the change is rolled back,
 * its audit record is rolled back too, so the log never describes a change that did not happen.
 */
@Service
public class AuditLogger {

    private static final int MAX_VALUE_LENGTH = 4000;

    private final AuditRepository repository;
    private final Clock clock;

    public AuditLogger(AuditRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public void record(String actor, String action, String entityType, Object entityId,
                       String oldValue, String newValue) {
        AuditEntry entry = new AuditEntry(actor, action, entityType, String.valueOf(entityId),
                trim(oldValue), trim(newValue), Instant.now(clock));
        repository.save(entry);
    }

    private static String trim(String value) {
        if (value == null || value.length() <= MAX_VALUE_LENGTH) {
            return value;
        }
        return value.substring(0, MAX_VALUE_LENGTH);
    }
}
