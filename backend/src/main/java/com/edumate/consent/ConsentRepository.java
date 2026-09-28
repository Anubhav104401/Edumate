package com.edumate.consent;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for consent records. */
public interface ConsentRepository extends JpaRepository<ConsentRecord, Long> {

    Optional<ConsentRecord> findFirstByApplicationIdOrderByIdDesc(Long applicationId);

    List<ConsentRecord> findByApplicationIdOrderByIdDesc(Long applicationId);
}
