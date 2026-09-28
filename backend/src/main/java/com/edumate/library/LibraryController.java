package com.edumate.library;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/** Library URLs for students and the librarian. */
@RestController
@RequestMapping("/api/library")
public class LibraryController {

    private final LibraryService library;

    public LibraryController(LibraryService library) {
        this.library = library;
    }

    @GetMapping("/books")
    public List<Book> books(CurrentUser me, @RequestParam(required = false) String q) {
        return library.search(me, q);
    }

    @GetMapping("/loans/me")
    public List<LibraryService.LoanView> myLoans(CurrentUser me) {
        return library.loansOf(me.requireStudentId());
    }

    @GetMapping("/loans")
    public List<LibraryService.LoanView> openLoans(CurrentUser me) {
        return library.openLoans(me);
    }

    @PostMapping("/loans")
    public LibraryService.LoanView issue(CurrentUser me, @Valid @RequestBody IssueRequest request) {
        return library.issue(me, request.bookId(), request.usn());
    }

    @PostMapping("/loans/{loanId}/return")
    public LibraryService.LoanView returnLoan(CurrentUser me, @PathVariable Long loanId) {
        return library.returnLoan(me, loanId);
    }

    public record IssueRequest(@NotNull Long bookId, @NotBlank(message = "Enter the student's USN.") String usn) {
    }
}
