package com.edumate.campus;

import java.time.Clock;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.config.AppProperties;

/**
 * Runs once at start-up and makes sure every campus listed under
 * "edumate.tenants" in application.yml exists in the database.
 * Adding a campus therefore needs a configuration change only, never a code change
 * (the "Flexibility" quality objective of the SQA Plan).
 */
@Component
@Order(1)
public class TenantProvisioner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantProvisioner.class);

    private final AppProperties properties;
    private final CampusRepository campuses;
    private final Clock clock;

    public TenantProvisioner(AppProperties properties, CampusRepository campuses, Clock clock) {
        this.properties = properties;
        this.campuses = campuses;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (AppProperties.Tenant tenant : properties.tenants()) {
            Campus campus = campuses.findById(tenant.code()).orElse(null);
            if (campus == null) {
                campuses.save(new Campus(tenant.code(), tenant.name(), tenant.city(), Instant.now(clock)));
                log.info("Provisioned new campus {} ({})", tenant.code(), tenant.name());
            } else {
                campus.setName(tenant.name());
                campus.setCity(tenant.city());
            }
        }
    }
}
