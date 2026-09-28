package com.edumate.attendance;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Database access for present/absent marks.
 * The two @Query methods count attendance with ONE grouped query each,
 * instead of one query per student or per course.
 */
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findBySessionId(Long sessionId);

    /** For one student: classes held and attended, per course. */
    @Query("""
            select new com.edumate.attendance.AttendanceCount(s.courseId, count(r),
                   sum(case when r.present = true then 1 else 0 end))
            from AttendanceRecord r, AttendanceSession s
            where r.sessionId = s.id and r.studentId = :studentId
            group by s.courseId
            """)
    List<AttendanceCount> countByCourseForStudent(@Param("studentId") Long studentId);

    /** For one course and section: classes held and attended, per student. */
    @Query("""
            select new com.edumate.attendance.AttendanceCount(r.studentId, count(r),
                   sum(case when r.present = true then 1 else 0 end))
            from AttendanceRecord r, AttendanceSession s
            where r.sessionId = s.id and s.courseId = :courseId and s.section = :section
            group by r.studentId
            """)
    List<AttendanceCount> countByStudentForCourse(@Param("courseId") Long courseId,
                                                  @Param("section") String section);
}
