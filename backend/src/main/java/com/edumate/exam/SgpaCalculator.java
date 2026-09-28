package com.edumate.exam;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * SGPA and CGPA arithmetic, written as small single-purpose methods.
 *
 * The SQA report found that the old SGPA method had a cyclomatic complexity of 19 (target: 10)
 * and recommended splitting it. Here every method has a complexity of 3 or less, and each
 * one can be tested on its own.
 *
 *   SGPA = sum(credits x grade point) / sum(credits)          for one semester
 *   CGPA = the same formula over every course of every semester so far
 * Both are rounded half-up to 2 decimal places.
 */
public final class SgpaCalculator {

    private SgpaCalculator() {
    }

    /** One graded course: its credits and the grade point earned. */
    public record GradedCourse(int credits, int gradePoint) {
    }

    /** The credits and SGPA of one earlier, already published semester (used for CGPA). */
    public record SemesterTotals(int credits, BigDecimal sgpa) {
    }

    public static BigDecimal totalMarks(BigDecimal internal, BigDecimal external) {
        return internal.add(external);
    }

    public static GradeScale grade(BigDecimal internal, BigDecimal external) {
        return GradeScale.of(totalMarks(internal, external), external);
    }

    public static BigDecimal sgpa(List<GradedCourse> courses) {
        int credits = courses.stream().mapToInt(GradedCourse::credits).sum();
        if (credits == 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return divide(BigDecimal.valueOf(weightedPoints(courses)), credits);
    }

    public static BigDecimal cgpa(List<SemesterTotals> earlier, List<GradedCourse> current) {
        BigDecimal points = BigDecimal.valueOf(weightedPoints(current));
        int credits = current.stream().mapToInt(GradedCourse::credits).sum();
        for (SemesterTotals semester : earlier) {
            points = points.add(semester.sgpa().multiply(BigDecimal.valueOf(semester.credits())));
            credits += semester.credits();
        }
        if (credits == 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return divide(points, credits);
    }

    private static int weightedPoints(List<GradedCourse> courses) {
        return courses.stream().mapToInt(c -> c.credits() * c.gradePoint()).sum();
    }

    private static BigDecimal divide(BigDecimal points, int credits) {
        return points.divide(BigDecimal.valueOf(credits), 2, RoundingMode.HALF_UP);
    }
}
