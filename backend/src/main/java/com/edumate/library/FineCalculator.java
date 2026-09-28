package com.edumate.library;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Component;

import com.edumate.config.AppProperties;

/**
 * Library fine = days late x fine per day, but never more than the maximum.
 * With the defaults (Rs 2 per day, at most Rs 200): 3 days late = Rs 6; 150 days late = Rs 200.
 */
@Component
public class FineCalculator {

    private final BigDecimal perDay;
    private final BigDecimal max;

    public FineCalculator(AppProperties properties) {
        this.perDay = properties.library().finePerDay();
        this.max = properties.library().maxFine();
    }

    public BigDecimal fine(LocalDate dueOn, LocalDate returnedOrToday) {
        long daysLate = Math.max(0, ChronoUnit.DAYS.between(dueOn, returnedOrToday));
        return perDay.multiply(BigDecimal.valueOf(daysLate)).min(max).setScale(2);
    }

    public long daysLate(LocalDate dueOn, LocalDate day) {
        return Math.max(0, ChronoUnit.DAYS.between(dueOn, day));
    }
}
