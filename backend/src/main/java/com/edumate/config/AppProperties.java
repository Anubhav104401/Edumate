package com.edumate.config;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Every "edumate:" setting from application.yml, turned into typed Java values.
 * Example: edumate.academic.attendance-threshold-percent = 75
 * becomes appProperties.academic().attendanceThresholdPercent() == 75.
 */
@ConfigurationProperties(prefix = "edumate")
public record AppProperties(
        Security security,
        Academic academic,
        Payment payment,
        Storage storage,
        Library library,
        Admissions admissions,
        Demo demo,
        List<Tenant> tenants) {

    /** Login and token settings. */
    public record Security(String jwtSecret, int tokenValidityHours, int maxFailedLogins,
                           int lockoutMinutes, boolean h2ConsoleEnabled) {
    }

    /** University regulation values that the code must obey exactly. */
    public record Academic(String regulation, int attendanceThresholdPercent, int weeksPerSemester) {
    }

    /** Secret shared with the payment gateway to sign callbacks. */
    public record Payment(String gatewaySecret) {
    }

    /** Folder where uploaded files are kept. */
    public record Storage(String root) {
    }

    /** Library loan period and fine rules. */
    public record Library(int loanDays, BigDecimal finePerDay, BigDecimal maxFine) {
    }

    /** Merit list weights and category reservation shares. */
    public record Admissions(BigDecimal entranceWeight, BigDecimal qualifyingWeight,
                             Map<String, BigDecimal> reservedShare) {
    }

    /** Demo-only switches. Both must be false in production. */
    public record Demo(boolean seed, boolean exposeOtp) {
    }

    /** One campus (tenant) of the university. */
    public record Tenant(String code, String name, String city) {
    }
}
