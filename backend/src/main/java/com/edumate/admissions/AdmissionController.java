package com.edumate.admissions;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/** Admission application URLs for applicants and admissions officers. */
@RestController
@RequestMapping("/api/admissions")
public class AdmissionController {

    private final AdmissionService admissions;
    private final MeritListGenerator meritList;

    public AdmissionController(AdmissionService admissions, MeritListGenerator meritList) {
        this.admissions = admissions;
        this.meritList = meritList;
    }

    @GetMapping("/my-application")
    public AdmissionService.ApplicationView mine(CurrentUser me) {
        return admissions.myApplication(me);
    }

    @PostMapping("/applications")
    public AdmissionService.ApplicationView create(CurrentUser me, @Valid @RequestBody ApplicationForm form) {
        return admissions.create(me, form);
    }

    @PutMapping("/applications/{id}")
    public AdmissionService.ApplicationView update(CurrentUser me, @PathVariable Long id,
                                                   @Valid @RequestBody ApplicationForm form) {
        return admissions.update(me, id, form);
    }

    @GetMapping("/applications")
    public List<AdmissionService.ApplicationSummary> list(CurrentUser me,
                                                          @RequestParam(required = false) AdmissionStatus status,
                                                          @RequestParam(required = false) String q) {
        return admissions.list(me, status, q);
    }

    @GetMapping("/applications/{id}")
    public AdmissionService.ApplicationView get(CurrentUser me, @PathVariable Long id) {
        return admissions.get(me, id);
    }

    /** POST /api/admissions/applications/7/transitions  body: { "action": "SHORTLIST", "reason": null } */
    @PostMapping("/applications/{id}/transitions")
    public AdmissionService.ApplicationView transition(CurrentUser me, @PathVariable Long id,
                                                       @Valid @RequestBody TransitionRequest request) {
        return admissions.transition(me, id, request.action(), request.reason());
    }

    @GetMapping("/merit-list")
    public MeritListGenerator.MeritList meritList(CurrentUser me, @RequestParam Long programId) {
        return meritList.generate(programId, me);
    }

    public record TransitionRequest(@NotNull AdmissionAction action, @Size(max = 300) String reason) {
    }
}
