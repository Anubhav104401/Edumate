package com.edumate.exam;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for course grades. */
public interface CourseGradeRepository extends JpaRepository<CourseGrade, Long> {

    List<CourseGrade> findByStudentResultIdIn(Collection<Long> studentResultIds);
}
