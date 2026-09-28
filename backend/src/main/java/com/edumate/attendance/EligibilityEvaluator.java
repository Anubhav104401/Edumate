package com.edumate.attendance;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.edumate.common.ApiException;
import com.edumate.config.AppProperties;

/**
 * Decides whether a student may be issued a hall ticket (design element "EligibilityEvaluator", FR-12).
 *
 * It encodes the decision table of the SQA report (Table 3.9):
 *
 *   Condition / Action              R1   R2   R3   R4   R5
 *   Attendance >= 75%               Y    N    Y    N    Y
 *   Fee fully paid                  Y    Y    N    N    Y
 *   Internal assessment complete    Y    Y    Y    Y    N
 *   Medical exemption approved      N    Y    N    N    N
 *   Issue hall ticket               Yes  Yes  No   No   No
 *
 * The table lists 5 of the 16 possible combinations. The code below handles all 16 with three
 * independent checks, and still reports which table rule (if any) the case matched.
 */
@Component
public class EligibilityEvaluator {

    public static final String FEE_DUES = "Fee dues";
    public static final String SHORTFALL = "Attendance shortfall";
    public static final String ASSESSMENT_PENDING = "Assessment pending";

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    /** The five rules of the decision table, kept as data so they can be shown and tested. */
    private static final List<TableRule> TABLE = List.of(
            new TableRule("R1", true, true, true, false),
            new TableRule("R2", false, true, true, true),
            new TableRule("R3", true, false, true, false),
            new TableRule("R4", false, false, true, false),
            new TableRule("R5", true, true, false, false));

    private final int thresholdPercent;

    public EligibilityEvaluator(AppProperties properties) {
        this.thresholdPercent = properties.academic().attendanceThresholdPercent();
    }

    /**
     * Attendance check when only a percentage is known.
     * Values outside 0–100 are rejected as invalid input (test cases TC-008a and TC-008b).
     * The comparison is ">=", so exactly 75.00% is eligible (fix for DEF-019, which used ">").
     */
    public boolean attendanceSatisfied(BigDecimal percent) {
        if (percent == null || percent.compareTo(ZERO) < 0 || percent.compareTo(HUNDRED) > 0) {
            throw ApiException.badRequest("INVALID_PERCENTAGE", "Attendance must be between 0 and 100 percent.");
        }
        return percent.compareTo(BigDecimal.valueOf(thresholdPercent)) >= 0;
    }

    /** Attendance check from raw counts, with no rounding at all. */
    public boolean attendanceSatisfied(long attended, long held) {
        return AttendanceMath.meetsThreshold(attended, held, thresholdPercent);
    }

    /** Applies the decision table and returns the decision with every reason for refusal. */
    public Decision decide(boolean attendanceOk, boolean feePaid, boolean assessmentComplete,
                           boolean medicalExemption) {
        List<String> reasons = new ArrayList<>();
        if (!feePaid) {
            reasons.add(FEE_DUES);
        }
        if (!attendanceOk && !medicalExemption) {
            reasons.add(SHORTFALL);
        }
        if (!assessmentComplete) {
            reasons.add(ASSESSMENT_PENDING);
        }
        String rule = TABLE.stream()
                .filter(r -> r.matches(attendanceOk, feePaid, assessmentComplete, medicalExemption))
                .map(TableRule::id)
                .findFirst()
                .orElse("derived");
        return new Decision(reasons.isEmpty(), rule, List.copyOf(reasons));
    }

    public int getThresholdPercent() {
        return thresholdPercent;
    }

    /** The outcome: eligible or not, which rule applied, and why. */
    public record Decision(boolean eligible, String rule, List<String> reasons) {
    }

    private record TableRule(String id, boolean attendance, boolean fee, boolean assessment, boolean medical) {
        boolean matches(boolean a, boolean f, boolean ia, boolean m) {
            return attendance == a && fee == f && assessment == ia && medical == m;
        }
    }
}
