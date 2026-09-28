package com.edumate.exam;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for result sets. */
public interface ResultSetRepository extends JpaRepository<ResultSet, Long> {

    Optional<ResultSet> findByExamSessionIdAndProgramIdAndSemester(Long examSessionId, Long programId, int semester);

    List<ResultSet> findAllByOrderByIdDesc();

    /**
     * Publishes the set ONLY IF it is still APPROVED, in one atomic database statement.
     * Returns 1 when this call published it and 0 when it was not approved or somebody
     * else published it a moment earlier. This replaces the old "read the flag, then write
     * the flag" code that let two operators publish the same results twice (fix for DEF-027).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update ResultSet r
               set r.status = :published, r.publishedBy = :actor, r.publishedAt = :now,
                   r.version = r.version + 1
             where r.id = :id and r.status = :approved
            """)
    int publishIfApproved(@Param("id") Long id, @Param("actor") String actor, @Param("now") Instant now,
                          @Param("approved") ResultStatus approved, @Param("published") ResultStatus published);
}
