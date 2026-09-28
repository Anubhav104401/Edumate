package com.edumate.fees;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Component;

/**
 * Makes receipt numbers like RCPT-20260928-000042.
 * The last part is the payment's own database id, which is already unique,
 * so two receipts can never get the same number (expected result of TC-005).
 */
@Component
public class ReceiptNumberGenerator {

    private static final DateTimeFormatter DAY = DateTimeFormatter.BASIC_ISO_DATE;

    private final Clock clock;

    public ReceiptNumberGenerator(Clock clock) {
        this.clock = clock;
    }

    public String next(Payment payment, Instant when) {
        LocalDate day = LocalDate.ofInstant(when, clock.getZone());
        return "RCPT-" + day.format(DAY) + "-" + String.format("%06d", payment.getId());
    }
}
