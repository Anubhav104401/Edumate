package com.edumate.attendance;

/**
 * The answer row of a grouped attendance query.
 * key = a course id or a student id (depending on the query),
 * held = classes conducted, attended = classes the student was present for.
 */
public record AttendanceCount(Long key, Long held, Long attended) {
}
