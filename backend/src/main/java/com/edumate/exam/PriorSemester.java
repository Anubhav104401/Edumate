package com.edumate.exam;

import java.math.BigDecimal;

/** An earlier, already published semester of one student: its credits and SGPA. */
public record PriorSemester(Long studentId, int credits, BigDecimal sgpa) {
}
