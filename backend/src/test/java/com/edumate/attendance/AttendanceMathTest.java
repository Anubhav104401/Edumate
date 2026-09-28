package com.edumate.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

/** The arithmetic behind "my attendance" and "classes I can still miss". */
class AttendanceMathTest {

    @Test
    void percentIsRoundedHalfUpForDisplayOnly() {
        assertThat(AttendanceMath.percent(18, 24)).isEqualByComparingTo("75.00");
        assertThat(AttendanceMath.percent(2, 3)).isEqualByComparingTo("66.67");
        assertThat(AttendanceMath.percent(0, 0)).isNull();
    }

    @Test
    void noClassesYetMeansNoShortfall() {
        assertThat(AttendanceMath.meetsThreshold(0, 0, 75)).isTrue();
    }

    @Test
    void classesCanMissLooksAtTheWholeSemester() {
        // 64 classes planned; 75% of 64 = 48 needed. 30 of 32 attended, 32 remaining: 62 possible, so 14 to spare.
        assertThat(AttendanceMath.classesCanMiss(30, 32, 64, 75)).isEqualTo(14);
        // 18 of 24 attended, 48 planned: needs 36, can still reach 42, so 6 to spare.
        assertThat(AttendanceMath.classesCanMiss(18, 24, 48, 75)).isEqualTo(6);
        // 10 of 30 attended, 40 planned: needs 30, can reach only 20: threshold unreachable.
        assertThat(AttendanceMath.classesCanMiss(10, 30, 40, 75)).isNegative();
    }

    @Test
    void maxAchievableAssumesEveryRemainingClassIsAttended() {
        assertThat(AttendanceMath.maxAchievablePercent(10, 30, 40)).isEqualByComparingTo(new BigDecimal("50.00"));
    }
}
