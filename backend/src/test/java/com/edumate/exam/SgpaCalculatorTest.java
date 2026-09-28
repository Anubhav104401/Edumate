package com.edumate.exam;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.edumate.exam.SgpaCalculator.GradedCourse;
import com.edumate.exam.SgpaCalculator.SemesterTotals;

/** SGPA / CGPA arithmetic and the R-2023 grade bands. */
class SgpaCalculatorTest {

    @Test
    @DisplayName("TC-013: grades S, A, B, B, C over credits 4, 4, 3, 3, 2")
    void tc013() {
        List<GradedCourse> courses = List.of(
                new GradedCourse(4, GradeScale.S.gradePoint()),
                new GradedCourse(4, GradeScale.A.gradePoint()),
                new GradedCourse(3, GradeScale.B.gradePoint()),
                new GradedCourse(3, GradeScale.B.gradePoint()),
                new GradedCourse(2, GradeScale.C.gradePoint()));
        // (4x10 + 4x9 + 3x8 + 3x8 + 2x7) / 16 = 138 / 16 = 8.625 -> 8.63 (half-up).
        // Note: the SQA report states 8.25 for this case; 8.25 is not reachable on the 10-point scale.
        assertThat(SgpaCalculator.sgpa(courses)).isEqualByComparingTo("8.63");
    }

    @ParameterizedTest(name = "internal {0} + external {1} -> {2}")
    @CsvSource({
            "36, 56, S", "30, 60, S", "34, 55.99, A", "30, 50, A", "30, 40, B", "25, 35, C",
            "20, 30, D", "15, 25, E", "10, 25, F", "40, 20, F"})
    void gradeBands(BigDecimal internal, BigDecimal external, GradeScale expected) {
        assertThat(SgpaCalculator.grade(internal, external)).isEqualTo(expected);
    }

    @Test
    @DisplayName("External marks below 21/60 fail the course even when the total is high")
    void externalMinimum() {
        assertThat(SgpaCalculator.grade(new BigDecimal("40"), new BigDecimal("20.99"))).isEqualTo(GradeScale.F);
        assertThat(SgpaCalculator.grade(new BigDecimal("40"), new BigDecimal("21"))).isEqualTo(GradeScale.C);
    }

    @Test
    void cgpaWeightsEverySemesterByItsCredits() {
        List<SemesterTotals> earlier = List.of(new SemesterTotals(20, new BigDecimal("8.00")),
                new SemesterTotals(20, new BigDecimal("9.00")));
        List<GradedCourse> current = List.of(new GradedCourse(10, 10));
        // (8x20 + 9x20 + 10x10) / 50 = 440 / 50 = 8.80
        assertThat(SgpaCalculator.cgpa(earlier, current)).isEqualByComparingTo("8.80");
    }

    @Test
    void emptyInputGivesZeroInsteadOfDividingByZero() {
        assertThat(SgpaCalculator.sgpa(List.of())).isEqualByComparingTo("0.00");
        assertThat(SgpaCalculator.cgpa(List.of(), List.of())).isEqualByComparingTo("0.00");
    }
}
