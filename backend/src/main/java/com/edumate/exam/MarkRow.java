package com.edumate.exam;

import java.math.BigDecimal;

/**
 * One line of the single query that feeds result computation: a student's marks in a course
 * together with that course's credits. Loading all of these at once is the fix for DR-03.
 */
public record MarkRow(Long studentId, Long courseId, int credits, BigDecimal internalMarks,
                      BigDecimal externalMarks, BigDecimal revaluedExternalMarks) {

    public BigDecimal effectiveExternal() {
        return revaluedExternalMarks != null ? revaluedExternalMarks : externalMarks;
    }

    public boolean isComplete() {
        return internalMarks != null && effectiveExternal() != null;
    }
}
