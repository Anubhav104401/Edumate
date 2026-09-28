package com.edumate.admissions;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** One person's application for admission to one programme. */
@Entity
@Table(name = "admission_application")
public class AdmissionApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_no", nullable = false, unique = true)
    private String applicationNo;

    @Column(name = "applicant_user_id")
    private Long applicantUserId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    /** GEN, OBC, SC or ST. */
    @Column(nullable = false)
    private String category;

    /** Entrance test score out of 100. */
    @Column(name = "entrance_score")
    private BigDecimal entranceScore;

    /** Percentage in the qualifying examination (e.g. Class 12). */
    @Column(name = "qualifying_percent")
    private BigDecimal qualifyingPercent;

    @Column(name = "guardian_name")
    private String guardianName;

    @Column(name = "guardian_email")
    private String guardianEmail;

    @Column(name = "guardian_phone")
    private String guardianPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdmissionStatus status = AdmissionStatus.DRAFT;

    @Column(name = "status_reason")
    private String statusReason;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AdmissionApplication() {
        // required by JPA
    }

    public AdmissionApplication(String applicationNo, Long applicantUserId, Instant now) {
        this.applicationNo = applicationNo;
        this.applicantUserId = applicantUserId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Copies the form fields in; used when creating and while the application is still a draft. */
    public void fill(String fullName, LocalDate dateOfBirth, String email, String phone, Long programId,
                     String category, BigDecimal entranceScore, BigDecimal qualifyingPercent,
                     String guardianName, String guardianEmail, String guardianPhone, Instant now) {
        this.fullName = fullName;
        this.dateOfBirth = dateOfBirth;
        this.email = email;
        this.phone = phone;
        this.programId = programId;
        this.category = category;
        this.entranceScore = entranceScore;
        this.qualifyingPercent = qualifyingPercent;
        this.guardianName = guardianName;
        this.guardianEmail = guardianEmail;
        this.guardianPhone = guardianPhone;
        this.updatedAt = now;
    }

    public void moveTo(AdmissionStatus next, String reason, Instant now) {
        if (next == AdmissionStatus.SUBMITTED) {
            this.submittedAt = now;
        }
        this.status = next;
        this.statusReason = reason;
        this.updatedAt = now;
    }

    /**
     * The real number (APP-2026-000042) needs the database id, which exists only after the first save,
     * so the row is first saved with a short unique placeholder such as TMP-3f2c9a1b7d4e60a5.
     */
    public static String placeholderNumber() {
        return "TMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    public void assignNumber(String applicationNo) {
        this.applicationNo = applicationNo;
    }

    /** Under 18 on the given day: the DPDP Rules then require verifiable guardian consent. */
    public boolean isMinorOn(LocalDate day) {
        return Period.between(dateOfBirth, day).getYears() < 18;
    }

    public Long getId() {
        return id;
    }

    public String getApplicationNo() {
        return applicationNo;
    }

    public Long getApplicantUserId() {
        return applicantUserId;
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

    public String getCategory() {
        return category;
    }

    public BigDecimal getEntranceScore() {
        return entranceScore;
    }

    public BigDecimal getQualifyingPercent() {
        return qualifyingPercent;
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

    public AdmissionStatus getStatus() {
        return status;
    }

    public String getStatusReason() {
        return statusReason;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
