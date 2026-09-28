package com.edumate.academic;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One enrolled student. Links to other tables are stored as plain id numbers
 * (programId) instead of object references, so loading a student never
 * triggers hidden extra queries.
 */
@Entity
@Table(name = "student")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String usn;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    private String email;

    private String phone;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(nullable = false)
    private int semester;

    @Column(nullable = false)
    private String section;

    @Column(name = "guardian_name")
    private String guardianName;

    @Column(name = "guardian_email")
    private String guardianEmail;

    @Column(name = "guardian_phone")
    private String guardianPhone;

    @Column(name = "campus_code", nullable = false)
    private String campusCode;

    protected Student() {
        // required by JPA
    }

    public Student(String usn, String fullName, LocalDate dateOfBirth, String email, String phone,
                   Long programId, int semester, String section, String campusCode) {
        this.usn = usn;
        this.fullName = fullName;
        this.dateOfBirth = dateOfBirth;
        this.email = email;
        this.phone = phone;
        this.programId = programId;
        this.semester = semester;
        this.section = section;
        this.campusCode = campusCode;
    }

    public void setGuardian(String name, String email, String phone) {
        this.guardianName = name;
        this.guardianEmail = email;
        this.guardianPhone = phone;
    }

    public Long getId() {
        return id;
    }

    public String getUsn() {
        return usn;
    }

    public String getFullName() {
        return fullName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
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

    public String getGuardianName() {
        return guardianName;
    }

    public String getGuardianEmail() {
        return guardianEmail;
    }

    public String getGuardianPhone() {
        return guardianPhone;
    }

    public String getCampusCode() {
        return campusCode;
    }
}
