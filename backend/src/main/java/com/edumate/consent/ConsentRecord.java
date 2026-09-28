package com.edumate.consent;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A guardian's consent for processing a minor applicant's personal data (DPDP Act 2023 / Rules 2025).
 * The one-time code (OTP) sent to the guardian is stored only as a bcrypt hash.
 */
@Entity
@Table(name = "consent_record")
public class ConsentRecord {

    public static final String PENDING = "PENDING";
    public static final String GRANTED = "GRANTED";
    public static final String REVOKED = "REVOKED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(nullable = false)
    private String purpose;

    @Column(name = "guardian_name", nullable = false)
    private String guardianName;

    @Column(name = "guardian_contact", nullable = false)
    private String guardianContact;

    @Column(nullable = false)
    private String status = PENDING;

    @Column(name = "otp_hash")
    private String otpHash;

    @Column(name = "otp_expires_at")
    private Instant otpExpiresAt;

    @Column(name = "otp_attempts", nullable = false)
    private int otpAttempts;

    @Column(name = "granted_at")
    private Instant grantedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ConsentRecord() {
        // required by JPA
    }

    public ConsentRecord(Long applicationId, String purpose, String guardianName, String guardianContact,
                         String otpHash, Instant otpExpiresAt, Instant createdAt) {
        this.applicationId = applicationId;
        this.purpose = purpose;
        this.guardianName = guardianName;
        this.guardianContact = guardianContact;
        this.otpHash = otpHash;
        this.otpExpiresAt = otpExpiresAt;
        this.createdAt = createdAt;
    }

    public void registerWrongAttempt() {
        this.otpAttempts++;
    }

    public void grant(Instant when) {
        this.status = GRANTED;
        this.grantedAt = when;
        this.otpHash = null;   // the code has done its job; nothing left to steal
    }

    public void revoke(Instant when) {
        this.status = REVOKED;
        this.revokedAt = when;
        this.otpHash = null;
    }

    public Long getId() {
        return id;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public String getPurpose() {
        return purpose;
    }

    public String getGuardianName() {
        return guardianName;
    }

    public String getGuardianContact() {
        return guardianContact;
    }

    public String getStatus() {
        return status;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public Instant getOtpExpiresAt() {
        return otpExpiresAt;
    }

    public int getOtpAttempts() {
        return otpAttempts;
    }

    public Instant getGrantedAt() {
        return grantedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
