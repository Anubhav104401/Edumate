package com.edumate.fees;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for fee demands (bills). */
public interface FeeDemandRepository extends JpaRepository<FeeDemand, Long> {

    List<FeeDemand> findByStudentIdOrderByDueDate(Long studentId);
}
