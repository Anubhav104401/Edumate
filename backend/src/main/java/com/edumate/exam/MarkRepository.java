package com.edumate.exam;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for marks. */
public interface MarkRepository extends JpaRepository<Mark, Long> {

    List<Mark> findByCourseIdAndExamSessionId(Long courseId, Long examSessionId);

    List<Mark> findByStudentIdAndExamSessionId(Long studentId, Long examSessionId);

    /**
     * Every mark of a whole cohort in ONE query (fix for design defect DR-03).
     * The old design ran one query per student: 11,400 students meant 11,400 round trips.
     */
    @Query("""
            select new com.edumate.exam.MarkRow(m.studentId, m.courseId, c.credits,
                   m.internalMarks, m.externalMarks, m.revaluedExternalMarks)
            from Mark m, Course c, Student s
            where c.id = m.courseId and s.id = m.studentId
              and m.examSessionId = :examSessionId
              and s.programId = :programId
              and c.semester = :semester
            order by m.studentId, m.courseId
            """)
    List<MarkRow> findRowsForCohort(@Param("examSessionId") Long examSessionId,
                                    @Param("programId") Long programId,
                                    @Param("semester") int semester);
}
