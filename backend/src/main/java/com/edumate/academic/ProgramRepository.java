package com.edumate.academic;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for degree programmes. */
public interface ProgramRepository extends JpaRepository<Program, Long> {

    List<Program> findByCampusCodeOrderByName(String campusCode);
}
