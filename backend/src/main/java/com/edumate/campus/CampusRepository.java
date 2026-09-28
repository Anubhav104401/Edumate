package com.edumate.campus;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for campuses. The primary key is the campus code, e.g. "JGC". */
public interface CampusRepository extends JpaRepository<Campus, String> {
}
