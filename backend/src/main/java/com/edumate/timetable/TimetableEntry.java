package com.edumate.timetable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One lecture in the weekly timetable: which course, taught by whom, where, on which day and period. */
@Entity
@Table(name = "timetable_entry")
public class TimetableEntry {

    public static final String DRAFT = "DRAFT";
    public static final String PUBLISHED = "PUBLISHED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(nullable = false)
    private int semester;

    @Column(nullable = false)
    private String section;

    /** 1 = Monday ... 5 = Friday. */
    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    /** 1 ... 6 (period 1 starts at 9:00). */
    @Column(nullable = false)
    private int period;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "faculty_id", nullable = false)
    private Long facultyId;

    @Column(nullable = false)
    private String room;

    @Column(nullable = false)
    private String status = DRAFT;

    protected TimetableEntry() {
        // required by JPA
    }

    public TimetableEntry(Long programId, int semester, String section, int dayOfWeek, int period,
                          Long courseId, Long facultyId, String room) {
        this.programId = programId;
        this.semester = semester;
        this.section = section;
        this.dayOfWeek = dayOfWeek;
        this.period = period;
        this.courseId = courseId;
        this.facultyId = facultyId;
        this.room = room;
    }

    public void moveTo(int dayOfWeek, int period, String room) {
        this.dayOfWeek = dayOfWeek;
        this.period = period;
        this.room = room;
    }

    public void publish() {
        this.status = PUBLISHED;
    }

    public Long getId() {
        return id;
    }

    public Long getProgramId() {
        return programId;
    }

    public int getSemester() {
        return semester;
    }

    public String getSection() {
        return section;
    }

    public int getDayOfWeek() {
        return dayOfWeek;
    }

    public int getPeriod() {
        return period;
    }

    public Long getCourseId() {
        return courseId;
    }

    public Long getFacultyId() {
        return facultyId;
    }

    public String getRoom() {
        return room;
    }

    public String getStatus() {
        return status;
    }
}
