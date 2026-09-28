package com.edumate.exam;

import java.math.BigDecimal;
import java.time.Instant;

/** One published semester result of a student, joined with its exam session name. */
public record PublishedRow(Long studentResultId, int semester, String examSessionCode, String examSessionName,
                           BigDecimal sgpa, BigDecimal cgpa, int creditsRegistered, int creditsEarned,
                           String outcome, Instant publishedAt) {
}
