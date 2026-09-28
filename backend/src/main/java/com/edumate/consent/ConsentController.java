package com.edumate.consent;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.admissions.AdmissionService;
import com.edumate.security.CurrentUser;

/** Guardian consent URLs used by the applicant's "Guardian consent" card. */
@RestController
@RequestMapping("/api/consent")
public class ConsentController {

    private final ConsentRegistry registry;
    private final AdmissionService admissions;

    public ConsentController(ConsentRegistry registry, AdmissionService admissions) {
        this.registry = registry;
        this.admissions = admissions;
    }

    @PostMapping("/applications/{applicationId}/request")
    public ConsentRegistry.ConsentView request(CurrentUser me, @PathVariable Long applicationId) {
        return registry.requestGuardianConsent(me, applicationId);
    }

    @PostMapping("/applications/{applicationId}/verify")
    public ConsentRegistry.ConsentView verify(CurrentUser me, @PathVariable Long applicationId,
                                              @Valid @RequestBody VerifyRequest request) {
        return registry.verify(me, applicationId, request.otp());
    }

    @GetMapping("/applications/{applicationId}")
    public List<ConsentRegistry.ConsentView> history(CurrentUser me, @PathVariable Long applicationId) {
        admissions.requireVisible(me, applicationId);
        return registry.history(applicationId);
    }

    @PostMapping("/{consentId}/revoke")
    public ConsentRegistry.ConsentView revoke(CurrentUser me, @PathVariable Long consentId) {
        return registry.revoke(me, consentId);
    }

    public record VerifyRequest(@NotBlank @Pattern(regexp = "\\d{6}", message = "The code has 6 digits.") String otp) {
    }
}
