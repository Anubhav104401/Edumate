package com.edumate.academic;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for examination sessions. */
public interface ExamSessionRepository extends JpaRepository<ExamSession, Long> {

    Optional<ExamSession> findByCode(String code);

    List<ExamSession> findByCampusCodeOrderByStartsOnDesc(String campusCode);
}
