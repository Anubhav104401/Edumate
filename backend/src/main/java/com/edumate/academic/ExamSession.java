package com.edumate.academic;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An examination session, for example "2026-ODD" (the odd-semester exams of 2026). */
@Entity
@Table(name = "exam_session")
public class ExamSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "starts_on", nullable = false)
    private LocalDate startsOn;

    @Column(name = "campus_code", nullable = false)
    private String campusCode;

    protected ExamSession() {
        // required by JPA
    }

    public ExamSession(String code, String name, LocalDate startsOn, String campusCode) {
        this.code = code;
        this.name = name;
        this.startsOn = startsOn;
        this.campusCode = campusCode;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public LocalDate getStartsOn() {
        return startsOn;
    }

    public String getCampusCode() {
        return campusCode;
    }
}
