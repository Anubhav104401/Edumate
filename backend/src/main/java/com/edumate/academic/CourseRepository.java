package com.edumate.academic;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for courses (subjects). */
public interface CourseRepository extends JpaRepository<Course, Long> {

    List<Course> findByFacultyIdOrderByCode(Long facultyId);

    List<Course> findByProgramIdAndSemesterOrderByCode(Long programId, int semester);

    List<Course> findByProgramIdInOrderByCode(List<Long> programIds);
}
