package com.edumate.exam;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for per-student results. */
public interface StudentResultRepository extends JpaRepository<StudentResult, Long> {

    List<StudentResult> findByResultSetIdOrderByStudentId(Long resultSetId);

    /** Removes the old rows before a recomputation (their course grades go too, via ON DELETE CASCADE). */
    @Modifying(flushAutomatically = true)
    @Query("delete from StudentResult r where r.resultSetId = :resultSetId")
    int deleteByResultSetId(@Param("resultSetId") Long resultSetId);

    /** Published earlier semesters of a programme, needed for CGPA — one query for the whole cohort. */
    @Query("""
            select new com.edumate.exam.PriorSemester(sr.studentId, sr.creditsRegistered, sr.sgpa)
            from StudentResult sr, ResultSet rs
            where sr.resultSetId = rs.id
              and rs.status = :published
              and rs.programId = :programId
              and rs.semester < :semester
            """)
    List<PriorSemester> findPublishedHistory(@Param("programId") Long programId,
                                             @Param("semester") int semester,
                                             @Param("published") ResultStatus published);

    /** Every published semester of one student, oldest first. */
    @Query("""
            select new com.edumate.exam.PublishedRow(sr.id, rs.semester, es.code, es.name, sr.sgpa, sr.cgpa,
                   sr.creditsRegistered, sr.creditsEarned, sr.outcome, rs.publishedAt)
            from StudentResult sr, ResultSet rs, ExamSession es
            where sr.resultSetId = rs.id and es.id = rs.examSessionId
              and rs.status = :published and sr.studentId = :studentId
            order by rs.semester
            """)
    List<PublishedRow> findPublishedForStudent(@Param("studentId") Long studentId,
                                               @Param("published") ResultStatus published);
}
