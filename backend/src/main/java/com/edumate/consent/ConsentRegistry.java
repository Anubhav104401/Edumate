package com.edumate.consent;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.admissions.AdmissionApplication;
import com.edumate.admissions.AdmissionApplicationRepository;
import com.edumate.admissions.AdmissionStatus;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.config.AppProperties;
import com.edumate.notifications.NotificationService;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/**
 * Verifiable guardian consent for minor applicants (design element "ConsentRegistry", NFR-07).
 *
 * This requirement did not exist in SRS v2.0: requirement review found it missing (RR-02, severity S1),
 * because the DPDP Rules, 2025 require verifiable consent from a parent before a child's personal
 * data is processed. "Verifiable" is achieved with a one-time code sent to the guardian's own
 * e-mail / phone: only someone who can read that inbox can complete the consent.
 * Consent is also revocable, as the Act requires.
 */
@Service
public class ConsentRegistry {

    public static final String PURPOSE = "Processing of a minor applicant's personal data for admission";

    private static final int OTP_VALID_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ConsentRepository consents;
    private final AdmissionApplicationRepository applications;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notifications;
    private final AuditLogger auditLogger;
    private final AppProperties properties;
    private final Clock clock;

    public ConsentRegistry(ConsentRepository consents, AdmissionApplicationRepository applications,
                           PasswordEncoder passwordEncoder, NotificationService notifications,
                           AuditLogger auditLogger, AppProperties properties, Clock clock) {
        this.consents = consents;
        this.applications = applications;
        this.passwordEncoder = passwordEncoder;
        this.notifications = notifications;
        this.auditLogger = auditLogger;
        this.properties = properties;
        this.clock = clock;
    }

    /** Sends a fresh 6-digit code to the guardian and records a PENDING consent. */
    @Transactional
    public ConsentView requestGuardianConsent(CurrentUser me, Long applicationId) {
        AdmissionApplication application = ownDraft(me, applicationId);
        if (!application.isMinorOn(LocalDate.now(clock))) {
            throw ApiException.badRequest("NOT_A_MINOR", "Guardian consent is needed only for applicants under 18.");
        }
        String contact = application.getGuardianEmail() != null ? application.getGuardianEmail()
                : application.getGuardianPhone();
        if (application.getGuardianName() == null || contact == null) {
            throw ApiException.badRequest("GUARDIAN_DETAILS_MISSING",
                    "Enter the guardian's name and e-mail or phone in the application first.");
        }

        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        Instant now = Instant.now(clock);
        ConsentRecord record = consents.save(new ConsentRecord(application.getId(), PURPOSE,
                application.getGuardianName(), contact, passwordEncoder.encode(otp),
                now.plus(OTP_VALID_MINUTES, ChronoUnit.MINUTES), now));
        String channel = application.getGuardianEmail() != null ? NotificationService.EMAIL : NotificationService.SMS;
        notifications.enqueue(channel, contact, "EduMate guardian consent code",
                "Dear " + application.getGuardianName() + ", " + application.getFullName()
                        + " has applied for admission. To consent to the processing of their personal data, "
                        + "share this code with them: " + otp + ". It expires in " + OTP_VALID_MINUTES + " minutes.",
                "consent-otp:" + record.getId());
        auditLogger.record(me.username(), "CONSENT_REQUESTED", "AdmissionApplication", application.getId(), null,
                "code sent to guardian " + mask(contact));
        return view(record, properties.demo().exposeOtp() ? otp : null);
    }

    /** Checks the code the guardian shared. noRollbackFor keeps the wrong-attempt counter. */
    @Transactional(noRollbackFor = ApiException.class)
    public ConsentView verify(CurrentUser me, Long applicationId, String otp) {
        AdmissionApplication application = ownDraft(me, applicationId);
        ConsentRecord record = consents.findFirstByApplicationIdOrderByIdDesc(application.getId())
                .filter(c -> ConsentRecord.PENDING.equals(c.getStatus()))
                .orElseThrow(() -> ApiException.badRequest("NO_PENDING_CONSENT", "Request a consent code first."));
        Instant now = Instant.now(clock);
        if (record.getOtpExpiresAt().isBefore(now)) {
            throw new ApiException(HttpStatus.GONE, "OTP_EXPIRED", "This code has expired. Request a new one.");
        }
        if (record.getOtpAttempts() >= MAX_ATTEMPTS) {
            throw ApiException.conflict("TOO_MANY_ATTEMPTS", "Too many wrong codes. Request a new one.");
        }
        if (otp == null || !passwordEncoder.matches(otp.trim(), record.getOtpHash())) {
            record.registerWrongAttempt();
            int left = MAX_ATTEMPTS - record.getOtpAttempts();
            throw ApiException.badRequest("WRONG_OTP", "That code is not correct. Attempts left: " + left + ".");
        }
        record.grant(now);
        auditLogger.record(me.username(), "CONSENT_GRANTED", "AdmissionApplication", application.getId(), null,
                "guardian " + record.getGuardianName());
        return view(record, null);
    }

    /** Withdraws consent. From then on the application cannot be processed further (except withdrawal). */
    @Transactional
    public ConsentView revoke(CurrentUser me, Long consentId) {
        ConsentRecord record = consents.findById(consentId).orElseThrow(() -> ApiException.notFound("Consent"));
        AdmissionApplication application = applications.findById(record.getApplicationId())
                .orElseThrow(() -> ApiException.notFound("Application"));
        if (!me.is(Role.ADMIN) && !me.id().equals(application.getApplicantUserId())) {
            throw ApiException.notFound("Consent");
        }
        if (!ConsentRecord.GRANTED.equals(record.getStatus())) {
            throw ApiException.conflict("NOT_GRANTED", "Only a granted consent can be revoked.");
        }
        record.revoke(Instant.now(clock));
        auditLogger.record(me.username(), "CONSENT_REVOKED", "AdmissionApplication", application.getId(),
                ConsentRecord.GRANTED, ConsentRecord.REVOKED);
        return view(record, null);
    }

    @Transactional(readOnly = true)
    public boolean hasValidGuardianConsent(Long applicationId) {
        return consents.findFirstByApplicationIdOrderByIdDesc(applicationId)
                .map(c -> ConsentRecord.GRANTED.equals(c.getStatus()))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<ConsentView> history(Long applicationId) {
        return consents.findByApplicationIdOrderByIdDesc(applicationId).stream().map(c -> view(c, null)).toList();
    }

    private AdmissionApplication ownDraft(CurrentUser me, Long applicationId) {
        AdmissionApplication application = applications.findById(applicationId)
                .filter(a -> me.id().equals(a.getApplicantUserId()))
                .orElseThrow(() -> ApiException.notFound("Application"));
        if (application.getStatus() != AdmissionStatus.DRAFT) {
            throw ApiException.conflict("NOT_DRAFT", "Consent can only be collected before the application is submitted.");
        }
        return application;
    }

    /** Shows only the first 2 and last 2 characters of a contact, e.g. "ra*********om". */
    static String mask(String contact) {
        if (contact.length() <= 4) {
            return "****";
        }
        return contact.substring(0, 2) + "*".repeat(contact.length() - 4) + contact.substring(contact.length() - 2);
    }

    private static ConsentView view(ConsentRecord c, String demoOtp) {
        return new ConsentView(c.getId(), c.getApplicationId(), c.getPurpose(), c.getGuardianName(),
                mask(c.getGuardianContact()), c.getStatus(), c.getOtpExpiresAt(), c.getGrantedAt(), c.getRevokedAt(),
                demoOtp);
    }

    /** demoOtp is filled only when edumate.demo.expose-otp=true, so the demo works without a real inbox. */
    public record ConsentView(Long id, Long applicationId, String purpose, String guardianName,
                              String guardianContact, String status, Instant otpExpiresAt, Instant grantedAt,
                              Instant revokedAt, String demoOtp) {
    }
}
