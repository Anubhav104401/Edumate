package com.edumate.common.audit;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Lets administrators read the audit trail. GET /api/audit */
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditRepository repository;

    public AuditController(AuditRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<AuditEntry> list(@RequestParam(required = false) String entityType,
                                 @RequestParam(required = false) String entityId) {
        if (entityType != null && entityId != null) {
            return repository.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(entityType, entityId);
        }
        return repository.findAllByOrderByOccurredAtDesc(PageRequest.of(0, 200));
    }
}
