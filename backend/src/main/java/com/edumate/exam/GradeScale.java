package com.edumate.exam;

import java.math.BigDecimal;

/**
 * The letter grades of regulation R-2023 (10-point scale).
 *
 *   Total marks (out of 100)   Grade   Grade point
 *   90 - 100                     S        10
 *   80 - 89.99                   A         9
 *   70 - 79.99                   B         8
 *   60 - 69.99                   C         7
 *   50 - 59.99                   D         6
 *   40 - 49.99                   E         5
 *   below 40, or external < 21   F         0
 */
public enum GradeScale {
    S(90, 10),
    A(80, 9),
    B(70, 8),
    C(60, 7),
    D(50, 6),
    E(40, 5),
    F(0, 0);

    /** Minimum semester-end (external) marks out of 60 needed to pass: 35%. */
    public static final BigDecimal MIN_EXTERNAL = BigDecimal.valueOf(21);

    private final int minimumTotal;
    private final int gradePoint;

    GradeScale(int minimumTotal, int gradePoint) {
        this.minimumTotal = minimumTotal;
        this.gradePoint = gradePoint;
    }

    /** Finds the grade for a total, checking the highest band first. */
    public static GradeScale of(BigDecimal total, BigDecimal external) {
        if (external.compareTo(MIN_EXTERNAL) < 0) {
            return F;
        }
        for (GradeScale grade : values()) {
            if (total.compareTo(BigDecimal.valueOf(grade.minimumTotal)) >= 0) {
                return grade;
            }
        }
        return F;
    }

    public int gradePoint() {
        return gradePoint;
    }

    public boolean isPass() {
        return this != F;
    }
}
