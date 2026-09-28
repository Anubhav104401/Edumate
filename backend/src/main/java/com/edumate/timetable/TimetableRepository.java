package com.edumate.timetable;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for timetable entries. */
public interface TimetableRepository extends JpaRepository<TimetableEntry, Long> {

    List<TimetableEntry> findByProgramIdAndSemesterAndSectionAndStatusOrderByDayOfWeekAscPeriodAsc(
            Long programId, int semester, String section, String status);

    List<TimetableEntry> findByFacultyIdAndStatusOrderByDayOfWeekAscPeriodAsc(Long facultyId, String status);

    List<TimetableEntry> findByStatus(String status);

    /** Published lectures of OTHER sections that involve these teachers or these rooms. */
    @Query("""
            select e from TimetableEntry e
            where e.status = 'PUBLISHED'
              and not (e.programId = :programId and e.semester = :semester and e.section = :section)
              and (e.facultyId in :facultyIds or e.room in :rooms)
            """)
    List<TimetableEntry> findCommitmentsElsewhere(@Param("programId") Long programId,
                                                  @Param("semester") int semester,
                                                  @Param("section") String section,
                                                  @Param("facultyIds") Collection<Long> facultyIds,
                                                  @Param("rooms") Collection<String> rooms);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            delete from TimetableEntry e
            where e.programId = :programId and e.semester = :semester and e.section = :section
              and e.status = :status
            """)
    int deleteSection(@Param("programId") Long programId, @Param("semester") int semester,
                      @Param("section") String section, @Param("status") String status);
}
