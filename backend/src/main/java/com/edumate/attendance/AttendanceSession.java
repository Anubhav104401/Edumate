package com.edumate.attendance;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * One class meeting whose attendance was taken: course + section + date + period.
 *
 * The @Version field is the fix for design defect DR-01. Every save adds 1 to it, and a save
 * that was based on an older number is refused, so two teachers editing the same sheet can
 * no longer silently overwrite each other.
 */
@Entity
@Table(name = "attendance_session")
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(nullable = false)
    private String section;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(nullable = false)
    private int period;

    @Column(name = "taken_by", nullable = false)
    private Long takenBy;

    @Version
    private long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AttendanceSession() {
        // required by JPA
    }

    public AttendanceSession(Long courseId, String section, LocalDate sessionDate, int period,
                             Long takenBy, Instant updatedAt) {
        this.courseId = courseId;
        this.section = section;
        this.sessionDate = sessionDate;
        this.period = period;
        this.takenBy = takenBy;
        this.updatedAt = updatedAt;
    }

    /** Marks the sheet as changed so that its version number goes up on save. */
    public void touch(Long userId, Instant when) {
        this.takenBy = userId;
        this.updatedAt = when;
    }

    public Long getId() {
        return id;
    }

    public Long getCourseId() {
        return courseId;
    }

    public String getSection() {
        return section;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public int getPeriod() {
        return period;
    }

    public Long getTakenBy() {
        return takenBy;
    }

    public long getVersion() {
        return version;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
