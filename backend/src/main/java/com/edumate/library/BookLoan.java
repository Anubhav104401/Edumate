package com.edumate.library;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One copy of a book lent to one student. returnedOn stays empty until the book comes back. */
@Entity
@Table(name = "book_loan")
public class BookLoan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "book_id", nullable = false)
    private Long bookId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "issued_on", nullable = false)
    private LocalDate issuedOn;

    @Column(name = "due_on", nullable = false)
    private LocalDate dueOn;

    @Column(name = "returned_on")
    private LocalDate returnedOn;

    @Column(name = "fine_amount", nullable = false)
    private BigDecimal fineAmount = BigDecimal.ZERO;

    protected BookLoan() {
        // required by JPA
    }

    public BookLoan(Long bookId, Long studentId, LocalDate issuedOn, LocalDate dueOn) {
        this.bookId = bookId;
        this.studentId = studentId;
        this.issuedOn = issuedOn;
        this.dueOn = dueOn;
    }

    public void close(LocalDate returnedOn, BigDecimal fine) {
        this.returnedOn = returnedOn;
        this.fineAmount = fine;
    }

    public boolean isOpen() {
        return returnedOn == null;
    }

    public Long getId() {
        return id;
    }

    public Long getBookId() {
        return bookId;
    }

    public Long getStudentId() {
        return studentId;
    }

    public LocalDate getIssuedOn() {
        return issuedOn;
    }

    public LocalDate getDueOn() {
        return dueOn;
    }

    public LocalDate getReturnedOn() {
        return returnedOn;
    }

    public BigDecimal getFineAmount() {
        return fineAmount;
    }
}
