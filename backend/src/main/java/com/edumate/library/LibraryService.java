package com.edumate.library;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.config.AppProperties;
import com.edumate.security.CurrentUser;

/** Library circulation: search, issue, return and fines. */
@Service
public class LibraryService {

    public static final int MAX_OPEN_LOANS = 3;

    private final BookRepository books;
    private final BookLoanRepository loans;
    private final StudentRepository students;
    private final FineCalculator fines;
    private final AuditLogger auditLogger;
    private final AppProperties properties;
    private final Clock clock;

    public LibraryService(BookRepository books, BookLoanRepository loans, StudentRepository students,
                          FineCalculator fines, AuditLogger auditLogger, AppProperties properties, Clock clock) {
        this.books = books;
        this.loans = loans;
        this.students = students;
        this.fines = fines;
        this.auditLogger = auditLogger;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<Book> search(CurrentUser me, String query) {
        return books.search(me.campusCode(), query == null ? "" : query.trim());
    }

    @Transactional
    public LoanView issue(CurrentUser me, Long bookId, String usn) {
        Book book = books.findById(bookId).filter(b -> b.getCampusCode().equals(me.campusCode()))
                .orElseThrow(() -> ApiException.notFound("Book"));
        Student student = students.findByUsn(usn.trim().toUpperCase())
                .filter(s -> s.getCampusCode().equals(me.campusCode()))
                .orElseThrow(() -> ApiException.notFound("Student " + usn));
        if (book.getCopiesAvailable() <= 0) {
            throw ApiException.conflict("NO_COPY_AVAILABLE", "All copies of this book are currently issued.");
        }
        if (loans.countByStudentIdAndReturnedOnIsNull(student.getId()) >= MAX_OPEN_LOANS) {
            throw ApiException.conflict("LOAN_LIMIT",
                    student.getFullName() + " already has " + MAX_OPEN_LOANS + " books. Return one first.");
        }
        LocalDate today = LocalDate.now(clock);
        book.takeCopy();
        BookLoan loan = loans.save(new BookLoan(book.getId(), student.getId(), today,
                today.plusDays(properties.library().loanDays())));
        books.flush();   // version check: fails with 409 if another librarian took the last copy meanwhile
        auditLogger.record(me.username(), "BOOK_ISSUED", "BookLoan", loan.getId(), null,
                book.getIsbn() + " to " + student.getUsn());
        return view(loan, book, student, today);
    }

    @Transactional
    public LoanView returnLoan(CurrentUser me, Long loanId) {
        BookLoan loan = loans.findById(loanId).orElseThrow(() -> ApiException.notFound("Loan"));
        if (!loan.isOpen()) {
            throw ApiException.conflict("ALREADY_RETURNED", "This book was already returned.");
        }
        Book book = books.findById(loan.getBookId()).orElseThrow(() -> ApiException.notFound("Book"));
        if (!book.getCampusCode().equals(me.campusCode())) {
            throw ApiException.notFound("Loan");
        }
        LocalDate today = LocalDate.now(clock);
        BigDecimal fine = fines.fine(loan.getDueOn(), today);
        loan.close(today, fine);
        book.returnCopy();
        Student student = students.findById(loan.getStudentId()).orElseThrow();
        auditLogger.record(me.username(), "BOOK_RETURNED", "BookLoan", loan.getId(), null,
                book.getIsbn() + " fine " + fine);
        return view(loan, book, student, today);
    }

    @Transactional(readOnly = true)
    public List<LoanView> loansOf(Long studentId) {
        Student student = students.findById(studentId).orElseThrow(() -> ApiException.notFound("Student"));
        List<BookLoan> list = loans.findByStudentIdOrderByIssuedOnDesc(studentId);
        return toViews(list, Map.of(student.getId(), student));
    }

    @Transactional(readOnly = true)
    public List<LoanView> openLoans(CurrentUser me) {
        List<BookLoan> list = loans.findByReturnedOnIsNullOrderByDueOn();
        Map<Long, Student> byId = students.findAllById(list.stream().map(BookLoan::getStudentId).distinct().toList())
                .stream().filter(s -> s.getCampusCode().equals(me.campusCode()))
                .collect(Collectors.toMap(Student::getId, Function.identity()));
        return toViews(list.stream().filter(l -> byId.containsKey(l.getStudentId())).toList(), byId);
    }

    private List<LoanView> toViews(List<BookLoan> list, Map<Long, Student> studentsById) {
        Map<Long, Book> bookById = books.findAllById(list.stream().map(BookLoan::getBookId).distinct().toList())
                .stream().collect(Collectors.toMap(Book::getId, Function.identity()));
        LocalDate today = LocalDate.now(clock);
        return list.stream()
                .map(l -> view(l, bookById.get(l.getBookId()), studentsById.get(l.getStudentId()), today))
                .toList();
    }

    /** For an open loan the fine shown is what would be charged if it came back today. */
    private LoanView view(BookLoan loan, Book book, Student student, LocalDate today) {
        LocalDate until = loan.isOpen() ? today : loan.getReturnedOn();
        BigDecimal fine = loan.isOpen() ? fines.fine(loan.getDueOn(), today) : loan.getFineAmount();
        return new LoanView(loan.getId(), book.getId(), book.getTitle(), book.getAuthor(), book.getIsbn(),
                student.getUsn(), student.getFullName(), loan.getIssuedOn(), loan.getDueOn(), loan.getReturnedOn(),
                fines.daysLate(loan.getDueOn(), until), fine, loan.isOpen());
    }

    public record LoanView(Long id, Long bookId, String title, String author, String isbn, String usn,
                           String studentName, LocalDate issuedOn, LocalDate dueOn, LocalDate returnedOn,
                           long daysLate, BigDecimal fine, boolean open) {
    }
}
