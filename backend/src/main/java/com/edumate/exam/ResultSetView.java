package com.edumate.exam;

import java.time.Instant;

/** What the Results page shows about one result set (safe to send to the browser). */
public record ResultSetView(Long id, Long examSessionId, String examSessionCode, Long programId, String programName,
                            int semester, ResultStatus status, String computedBy, Instant computedAt,
                            String firstApprover, Instant firstApprovedAt, String secondApprover,
                            Instant secondApprovedAt, String publishedBy, Instant publishedAt) {

    public static ResultSetView of(ResultSet set, String examSessionCode, String programName) {
        return new ResultSetView(set.getId(), set.getExamSessionId(), examSessionCode, set.getProgramId(),
                programName, set.getSemester(), set.getStatus(), set.getComputedBy(), set.getComputedAt(),
                set.getFirstApprover(), set.getFirstApprovedAt(), set.getSecondApprover(),
                set.getSecondApprovedAt(), set.getPublishedBy(), set.getPublishedAt());
    }
}
