package com.edumate.academic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A degree programme such as "B.Tech Computer Science and Engineering". */
@Entity
@Table(name = "program")
public class Program {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    /** UG, PG or PHD. */
    @Column(nullable = false)
    private String level;

    @Column(name = "total_seats", nullable = false)
    private int totalSeats;

    @Column(name = "campus_code", nullable = false)
    private String campusCode;

    protected Program() {
        // required by JPA
    }

    public Program(String code, String name, String level, int totalSeats, String campusCode) {
        this.code = code;
        this.name = name;
        this.level = level;
        this.totalSeats = totalSeats;
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

    public String getLevel() {
        return level;
    }

    public int getTotalSeats() {
        return totalSeats;
    }

    public String getCampusCode() {
        return campusCode;
    }
}
