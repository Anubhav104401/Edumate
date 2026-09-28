package com.edumate.admissions;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.Year;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Program;
import com.edumate.academic.ProgramRepository;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.consent.ConsentRecord;
import com.edumate.consent.ConsentRepository;
import com.edumate.documents.ApplicationDocument;
import com.edumate.documents.ApplicationDocumentRepository;
import com.edumate.documents.DocumentType;
import com.edumate.notifications.NotificationService;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/**
 * Everything an applicant or admissions officer does with an application.
 * Every status change goes through AdmissionStateMachine, and SUBMIT has three extra guards:
 * scores entered, required documents uploaded, and (for a minor) guardian consent GRANTED (TC-020).
 */
@Service
public class AdmissionService {

    /** Actions still allowed after a minor's guardian consent is revoked: stopping, never continuing. */
    private static final Set<AdmissionAction> ALLOWED_WITHOUT_CONSENT =
            EnumSet.of(AdmissionAction.WITHDRAW, AdmissionAction.REJECT);

    private final AdmissionApplicationRepository applications;
    private final ProgramRepository programs;
    private final AdmissionStateMachine stateMachine;
    private final ConsentRepository consents;
    private final ApplicationDocumentRepository documents;
    private final NotificationService notifications;
    private final AuditLogger auditLogger;
    private final Clock clock;

    public AdmissionService(AdmissionApplicationRepository applications, ProgramRepository programs,
                            AdmissionStateMachine stateMachine, ConsentRepository consents,
                            ApplicationDocumentRepository documents, NotificationService notifications,
                            AuditLogger auditLogger, Clock clock) {
        this.applications = applications;
        this.programs = programs;
        this.stateMachine = stateMachine;
        this.consents = consents;
        this.documents = documents;
        this.notifications = notifications;
        this.auditLogger = auditLogger;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ApplicationView myApplication(CurrentUser me) {
        return applications.findFirstByApplicantUserIdOrderByIdDesc(me.id())
                .map(a -> view(a, me))
                .orElseThrow(() -> ApiException.notFound("Application"));
    }

    @Transactional
    public ApplicationView create(CurrentUser me, ApplicationForm form) {
        applications.findFirstByApplicantUserIdOrderByIdDesc(me.id())
                .filter(a -> a.getStatus() != AdmissionStatus.WITHDRAWN)
                .ifPresent(a -> {
                    throw ApiException.conflict("ALREADY_APPLIED", "You already have an application. Edit it instead.");
                });
        Program program = programOfCampus(form.programId(), me);
        Instant now = Instant.now(clock);
        AdmissionApplication application = new AdmissionApplication(AdmissionApplication.placeholderNumber(), me.id(), now);
        fill(application, form, program, now);
        applications.save(application);
        application.assignNumber(String.format("APP-%d-%06d", Year.now(clock).getValue(), application.getId()));
        auditLogger.record(me.username(), "ADMISSION_CREATED", "AdmissionApplication", application.getId(), null,
                application.getApplicationNo());
        return view(application, me);
    }

    @Transactional
    public ApplicationView update(CurrentUser me, Long applicationId, ApplicationForm form) {
        AdmissionApplication application = requireOwnDraft(me, applicationId);
        Program program = programOfCampus(form.programId(), me);
        fill(application, form, program, Instant.now(clock));
        auditLogger.record(me.username(), "ADMISSION_UPDATED", "AdmissionApplication", application.getId(), null,
                "form saved");
        return view(application, me);
    }

    @Transactional
    public ApplicationView transition(CurrentUser me, Long applicationId, AdmissionAction action, String reason) {
        AdmissionApplication application = requireVisible(me, applicationId);
        AdmissionStateMachine.Transition t = stateMachine.resolve(application.getStatus(), action, me.role());
        String cleanReason = reason == null || reason.isBlank() ? null : reason.trim();
        if (t.reasonRequired() && cleanReason == null) {
            throw ApiException.badRequest("REASON_REQUIRED", "Please give a reason for this decision.");
        }
        boolean minor = application.isMinorOn(LocalDate.now(clock));
        if (action == AdmissionAction.SUBMIT) {
            checkReadyToSubmit(application, minor);
        } else if (minor && !ALLOWED_WITHOUT_CONSENT.contains(action) && !consentGranted(application.getId())) {
            throw ApiException.conflict("CONSENT_REVOKED",
                    "Guardian consent for this minor applicant is not in force, so the application cannot proceed.");
        }

        AdmissionStatus before = application.getStatus();
        application.moveTo(t.to(), cleanReason, Instant.now(clock));
        applications.flush();
        auditLogger.record(me.username(), "ADMISSION_" + action, "AdmissionApplication", application.getId(),
                before.name(), t.to().name() + (cleanReason == null ? "" : " (reason: " + cleanReason + ")"));
        notifications.enqueue(NotificationService.EMAIL, application.getEmail(),
                "Application " + application.getApplicationNo() + ": " + t.to(),
                "Dear " + application.getFullName() + ", the status of your application "
                        + application.getApplicationNo() + " is now " + t.to() + "."
                        + (cleanReason == null ? "" : " Reason: " + cleanReason),
                "admission:" + application.getId() + ":" + t.to() + ":" + application.getVersion());
        return view(application, me);
    }

    @Transactional(readOnly = true)
    public List<ApplicationSummary> list(CurrentUser me, AdmissionStatus status, String query) {
        Map<Long, String> programNames = programs.findByCampusCodeOrderByName(me.campusCode()).stream()
                .collect(Collectors.toMap(Program::getId, Program::getName));
        return applications.search(me.campusCode(), status, query == null ? "" : query.trim()).stream()
                .map(a -> new ApplicationSummary(a.getId(), a.getApplicationNo(), a.getFullName(),
                        programNames.get(a.getProgramId()), a.getCategory(), a.getEntranceScore(),
                        a.getQualifyingPercent(), a.getStatus(), a.getSubmittedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ApplicationView get(CurrentUser me, Long applicationId) {
        return view(requireVisible(me, applicationId), me);
    }

    /** Applicants see only their own application; officers see applications of their campus. */
    @Transactional(readOnly = true)
    public AdmissionApplication requireVisible(CurrentUser me, Long applicationId) {
        AdmissionApplication application = applications.findById(applicationId)
                .orElseThrow(() -> ApiException.notFound("Application"));
        boolean visible;
        if (me.is(Role.APPLICANT)) {
            visible = me.id().equals(application.getApplicantUserId());
        } else {
            visible = programs.findById(application.getProgramId())
                    .map(p -> p.getCampusCode().equals(me.campusCode())).orElse(false);
        }
        if (!visible) {
            throw ApiException.notFound("Application");   // do not even confirm that it exists
        }
        return application;
    }

    public AdmissionApplication requireOwnDraft(CurrentUser me, Long applicationId) {
        AdmissionApplication application = requireVisible(me, applicationId);
        if (!me.id().equals(application.getApplicantUserId())) {
            throw ApiException.notFound("Application");
        }
        if (application.getStatus() != AdmissionStatus.DRAFT) {
            throw ApiException.conflict("NOT_DRAFT", "A submitted application can no longer be edited.");
        }
        return application;
    }

    private void checkReadyToSubmit(AdmissionApplication application, boolean minor) {
        if (application.getEntranceScore() == null || application.getQualifyingPercent() == null) {
            throw ApiException.badRequest("SCORES_MISSING",
                    "Enter your entrance score and qualifying examination percentage before submitting.");
        }
        List<DocumentType> missing = missingDocuments(application.getId());
        if (!missing.isEmpty()) {
            throw ApiException.badRequest("DOCUMENTS_MISSING", "Upload these documents first: "
                    + missing.stream().map(DocumentType::label).collect(Collectors.joining(", ")) + ".");
        }
        if (minor && !consentGranted(application.getId())) {
            throw ApiException.conflict("GUARDIAN_CONSENT_REQUIRED",
                    "You are under 18. Your parent or guardian must give consent before you can submit.");
        }
    }

    private List<DocumentType> missingDocuments(Long applicationId) {
        Set<DocumentType> uploaded = documents.findByApplicationIdOrderByDocType(applicationId).stream()
                .map(ApplicationDocument::getDocType).collect(Collectors.toSet());
        return DocumentType.requiredTypes().stream().filter(t -> !uploaded.contains(t)).toList();
    }

    private boolean consentGranted(Long applicationId) {
        return consents.findFirstByApplicationIdOrderByIdDesc(applicationId)
                .map(c -> ConsentRecord.GRANTED.equals(c.getStatus())).orElse(false);
    }

    private Program programOfCampus(Long programId, CurrentUser me) {
        return programs.findById(programId)
                .filter(p -> p.getCampusCode().equals(me.campusCode()))
                .orElseThrow(() -> ApiException.badRequest("UNKNOWN_PROGRAMME", "Choose a programme from the list."));
    }

    private static void fill(AdmissionApplication a, ApplicationForm f, Program program, Instant now) {
        a.fill(f.fullName().trim(), f.dateOfBirth(), f.email().trim().toLowerCase(), blankToNull(f.phone()),
                program.getId(), f.category(), f.entranceScore(), f.qualifyingPercent(), blankToNull(f.guardianName()),
                blankToNull(f.guardianEmail()), blankToNull(f.guardianPhone()), now);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ApplicationView view(AdmissionApplication a, CurrentUser me) {
        LocalDate today = LocalDate.now(clock);
        boolean minor = a.isMinorOn(today);
        String consentStatus = !minor ? "NOT_REQUIRED" : consents.findFirstByApplicationIdOrderByIdDesc(a.getId())
                .map(ConsentRecord::getStatus).orElse("NOT_REQUESTED");
        String programName = programs.findById(a.getProgramId()).map(Program::getName).orElse("?");
        return new ApplicationView(a.getId(), a.getApplicationNo(), a.getFullName(), a.getDateOfBirth(),
                Period.between(a.getDateOfBirth(), today).getYears(), minor, a.getEmail(), a.getPhone(),
                a.getProgramId(), programName, a.getCategory(), a.getEntranceScore(), a.getQualifyingPercent(),
                a.getGuardianName(), a.getGuardianEmail(), a.getGuardianPhone(), a.getStatus(), a.getStatusReason(),
                a.getSubmittedAt(), a.getUpdatedAt(), consentStatus, missingDocuments(a.getId()),
                stateMachine.allowedActions(a.getStatus(), me.role()));
    }

    /** The full application as shown on its detail page. */
    public record ApplicationView(Long id, String applicationNo, String fullName, LocalDate dateOfBirth, int age,
                                  boolean minor, String email, String phone, Long programId, String programName,
                                  String category, BigDecimal entranceScore, BigDecimal qualifyingPercent,
                                  String guardianName, String guardianEmail, String guardianPhone,
                                  AdmissionStatus status, String statusReason, Instant submittedAt,
                                  Instant updatedAt, String consentStatus, List<DocumentType> missingDocuments,
                                  List<AdmissionAction> allowedActions) {
    }

    /** One row of the officer's applications table. */
    public record ApplicationSummary(Long id, String applicationNo, String fullName, String programName,
                                     String category, BigDecimal entranceScore, BigDecimal qualifyingPercent,
                                     AdmissionStatus status, Instant submittedAt) {
    }
}
