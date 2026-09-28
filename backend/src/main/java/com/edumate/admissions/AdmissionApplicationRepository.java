package com.edumate.admissions;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for admission applications. */
public interface AdmissionApplicationRepository extends JpaRepository<AdmissionApplication, Long> {

    Optional<AdmissionApplication> findFirstByApplicantUserIdOrderByIdDesc(Long applicantUserId);

    List<AdmissionApplication> findByProgramIdAndStatusIn(Long programId, Collection<AdmissionStatus> statuses);

    /** Applications of one campus, optionally filtered by status (null = any) and a name / number search ('' = any). */
    @Query("""
            select a from AdmissionApplication a, Program p
            where p.id = a.programId and p.campusCode = :campus
              and (:status is null or a.status = :status)
              and (:q = '' or lower(a.fullName) like lower(concat('%', :q, '%'))
                   or lower(a.applicationNo) like lower(concat('%', :q, '%')))
            order by a.id desc
            """)
    List<AdmissionApplication> search(@Param("campus") String campusCode,
                                      @Param("status") AdmissionStatus status,
                                      @Param("q") String query);
}
