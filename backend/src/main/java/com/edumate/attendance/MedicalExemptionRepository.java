package com.edumate.attendance;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for medical exemptions. */
public interface MedicalExemptionRepository extends JpaRepository<MedicalExemption, Long> {

    List<MedicalExemption> findByStudentIdAndApprovedTrue(Long studentId);

    List<MedicalExemption> findByCourseIdAndApprovedTrue(Long courseId);
}
