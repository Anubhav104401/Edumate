package com.edumate.academic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A subject taught in one semester of one programme, e.g. "23CS502 Database Management Systems". */
@Entity
@Table(name = "course")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int credits;

    /** Lecture hours per week; used to plan the timetable and total classes. */
    @Column(name = "weekly_hours", nullable = false)
    private int weeklyHours;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(nullable = false)
    private int semester;

    /** The app_user id of the teacher; may be empty until a teacher is assigned. */
    @Column(name = "faculty_id")
    private Long facultyId;

    protected Course() {
        // required by JPA
    }

    public Course(String code, String name, int credits, int weeklyHours,
                  Long programId, int semester, Long facultyId) {
        this.code = code;
        this.name = name;
        this.credits = credits;
        this.weeklyHours = weeklyHours;
        this.programId = programId;
        this.semester = semester;
        this.facultyId = facultyId;
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

    public int getCredits() {
        return credits;
    }

    public int getWeeklyHours() {
        return weeklyHours;
    }

    public Long getProgramId() {
        return programId;
    }

    public int getSemester() {
        return semester;
    }

    public Long getFacultyId() {
        return facultyId;
    }
}
