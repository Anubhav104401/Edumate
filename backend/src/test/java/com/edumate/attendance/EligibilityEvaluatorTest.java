package com.edumate.attendance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.edumate.TestFixtures;
import com.edumate.common.ApiException;

/**
 * The attendance-eligibility rule, tested with the two design techniques of the SQA report:
 * boundary value analysis (Table 3.8) and the decision table (Table 3.9).
 */
class EligibilityEvaluatorTest {

    private final EligibilityEvaluator evaluator = new EligibilityEvaluator(TestFixtures.properties());

    @ParameterizedTest(name = "{0}: {1}% -> eligible = {2}")
    @CsvSource({
            "TC-008 below boundary, 74.99, false",
            "TC-009 at boundary (DEF-019), 75.00, true",
            "TC-010 above boundary, 75.01, true",
            "lowest valid, 0, false",
            "highest valid, 100, true"})
    @DisplayName("Boundary value analysis around the 75% threshold")
    void boundaryValues(String testCase, BigDecimal percent, boolean expected) {
        assertThat(evaluator.attendanceSatisfied(percent)).as(testCase).isEqualTo(expected);
    }

    @ParameterizedTest(name = "{0}: {1}% is rejected")
    @CsvSource({"TC-008a invalid low, -1", "TC-008b invalid high, 101"})
    void invalidPercentagesAreRejected(String testCase, BigDecimal percent) {
        assertThatThrownBy(() -> evaluator.attendanceSatisfied(percent))
                .as(testCase)
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("between 0 and 100");
    }

    @Test
    @DisplayName("Counts are compared exactly: 18 of 24 is 75.00% and eligible; 74.99% is not rounded up")
    void exactCountsAreNotRounded() {
        assertThat(evaluator.attendanceSatisfied(18, 24)).isTrue();          // exactly 75%
        assertThat(evaluator.attendanceSatisfied(7499, 10000)).isFalse();    // 74.99%
        assertThat(evaluator.attendanceSatisfied(29999, 40000)).isFalse();   // 74.9975% would round to 75.00
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', value = {
            "R1 | true  | true  | true  | false | true  | ''",
            "R2 | false | true  | true  | true  | true  | ''",
            "R3 | true  | false | true  | false | false | Fee dues",
            "R4 | false | false | true  | false | false | Fee dues;Attendance shortfall",
            "R5 | true  | true  | false | false | false | Assessment pending"})
    @DisplayName("Decision table for examination eligibility (Table 3.9)")
    void decisionTable(String rule, boolean attendance, boolean fee, boolean assessment, boolean medical,
                       boolean eligible, String reasons) {
        EligibilityEvaluator.Decision decision = evaluator.decide(attendance, fee, assessment, medical);
        assertThat(decision.rule()).isEqualTo(rule);
        assertThat(decision.eligible()).isEqualTo(eligible);
        assertThat(String.join(";", decision.reasons())).isEqualTo(reasons);
    }

    @Test
    @DisplayName("Combinations the table does not list are still decided, and marked as derived")
    void combinationsOutsideTheTable() {
        EligibilityEvaluator.Decision decision = evaluator.decide(false, false, false, false);
        assertThat(decision.rule()).isEqualTo("derived");
        assertThat(decision.eligible()).isFalse();
        assertThat(decision.reasons()).containsExactly("Fee dues", "Attendance shortfall", "Assessment pending");
    }
}
