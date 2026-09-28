package com.edumate.library;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for book loans. */
public interface BookLoanRepository extends JpaRepository<BookLoan, Long> {

    List<BookLoan> findByStudentIdOrderByIssuedOnDesc(Long studentId);

    long countByStudentIdAndReturnedOnIsNull(Long studentId);

    List<BookLoan> findByReturnedOnIsNullOrderByDueOn();
}
