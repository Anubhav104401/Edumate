package com.edumate.attendance;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for attendance sessions (one per class meeting). */
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {

    Optional<AttendanceSession> findByCourseIdAndSectionAndSessionDateAndPeriod(
            Long courseId, String section, LocalDate sessionDate, int period);
}
