package com.edumate.academic;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Database access for students. */
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByUsn(String usn);

    List<Student> findByProgramIdAndSemesterAndSectionOrderByUsn(Long programId, int semester, String section);

    List<Student> findByProgramIdAndSemesterOrderByUsn(Long programId, int semester);

    /** The section letters that exist in one semester of a programme, e.g. [A, B]. */
    @Query("select distinct s.section from Student s where s.programId = :programId and s.semester = :semester order by s.section")
    List<String> findSections(@Param("programId") Long programId, @Param("semester") int semester);

    /** Case-insensitive search by name or USN within one campus. */
    @Query("""
            select s from Student s
            where s.campusCode = :campus
              and (lower(s.fullName) like lower(concat('%', :q, '%'))
                   or lower(s.usn) like lower(concat('%', :q, '%')))
            order by s.usn
            """)
    List<Student> search(@Param("campus") String campusCode, @Param("q") String query);
}
