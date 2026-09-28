package com.edumate.attendance;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure arithmetic for attendance, with no database and no Spring.
 *
 * The eligibility decision uses whole numbers only (attended × 100 >= threshold × held),
 * so a student at 74.996% is never rounded up to 75.00% and let through by accident.
 * Percentages with two decimals are produced only for display.
 */
public final class AttendanceMath {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private AttendanceMath() {
    }

    /** attended ÷ held × 100, rounded to 2 decimals for display; null when no class was held yet. */
    public static BigDecimal percent(long attended, long held) {
        if (held == 0) {
            return null;
        }
        return BigDecimal.valueOf(attended).multiply(HUNDRED)
                .divide(BigDecimal.valueOf(held), 2, RoundingMode.HALF_UP);
    }

    /** Exact, inclusive comparison: exactly 75.00% counts as meeting a 75% threshold (fix for DEF-019). */
    public static boolean meetsThreshold(long attended, long held, int thresholdPercent) {
        if (held == 0) {
            return true;
        }
        return attended * 100 >= (long) thresholdPercent * held;
    }

    /**
     * How many of the remaining planned classes the student may still miss and end the
     * semester at or above the threshold. Negative means the threshold can no longer be reached.
     */
    public static long classesCanMiss(long attended, long held, long plannedTotal, int thresholdPercent) {
        long remaining = Math.max(0, plannedTotal - held);
        long needed = ceilDiv((long) thresholdPercent * plannedTotal, 100);
        return attended + remaining - needed;
    }

    /** The best percentage still possible if the student attends every remaining class. */
    public static BigDecimal maxAchievablePercent(long attended, long held, long plannedTotal) {
        long total = Math.max(plannedTotal, held);
        long remaining = total - held;
        return percent(attended + remaining, total);
    }

    private static long ceilDiv(long a, long b) {
        return (a + b - 1) / b;
    }
}
