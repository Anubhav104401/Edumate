package com.edumate.library;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * A title in the library catalogue with its number of copies.
 * @Version stops two librarians issuing the last copy to two students at the same moment.
 */
@Entity
@Table(name = "book")
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String isbn;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String author;

    @Column(name = "copies_total", nullable = false)
    private int copiesTotal;

    @Column(name = "copies_available", nullable = false)
    private int copiesAvailable;

    @Column(name = "campus_code", nullable = false)
    private String campusCode;

    @Version
    private long version;

    protected Book() {
        // required by JPA
    }

    public Book(String isbn, String title, String author, int copies, String campusCode) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
        this.copiesTotal = copies;
        this.copiesAvailable = copies;
        this.campusCode = campusCode;
    }

    public void takeCopy() {
        if (copiesAvailable <= 0) {
            throw new IllegalStateException("No copy available");
        }
        copiesAvailable--;
    }

    public void returnCopy() {
        if (copiesAvailable < copiesTotal) {
            copiesAvailable++;
        }
    }

    public Long getId() {
        return id;
    }

    public String getIsbn() {
        return isbn;
    }

    public String getTitle() {
        return title;
    }

    public String getAuthor() {
        return author;
    }

    public int getCopiesTotal() {
        return copiesTotal;
    }

    public int getCopiesAvailable() {
        return copiesAvailable;
    }

    public String getCampusCode() {
        return campusCode;
    }

    public long getVersion() {
        return version;
    }
}
