package com.edumate.admissions;

import static com.edumate.admissions.AdmissionAction.ENROL;
import static com.edumate.admissions.AdmissionAction.OFFER;
import static com.edumate.admissions.AdmissionAction.REJECT;
import static com.edumate.admissions.AdmissionAction.REVERSE_ENROLMENT;
import static com.edumate.admissions.AdmissionAction.SHORTLIST;
import static com.edumate.admissions.AdmissionAction.START_REVIEW;
import static com.edumate.admissions.AdmissionAction.SUBMIT;
import static com.edumate.admissions.AdmissionAction.WITHDRAW;
import static com.edumate.admissions.AdmissionStatus.DRAFT;
import static com.edumate.admissions.AdmissionStatus.ENROLLED;
import static com.edumate.admissions.AdmissionStatus.ENROLMENT_REVERSED;
import static com.edumate.admissions.AdmissionStatus.OFFERED;
import static com.edumate.admissions.AdmissionStatus.REJECTED;
import static com.edumate.admissions.AdmissionStatus.SHORTLISTED;
import static com.edumate.admissions.AdmissionStatus.SUBMITTED;
import static com.edumate.admissions.AdmissionStatus.UNDER_REVIEW;
import static com.edumate.admissions.AdmissionStatus.WITHDRAWN;
import static com.edumate.security.Role.ADMIN;
import static com.edumate.security.Role.ADMISSIONS_OFFICER;
import static com.edumate.security.Role.APPLICANT;

import java.util.List;

import org.springframework.stereotype.Component;

import com.edumate.common.ApiException;
import com.edumate.security.Role;

/**
 * The admission application lifecycle, written as a table of allowed arrows (Fig. 3.2 of the report):
 *
 *   DRAFT --SUBMIT--> SUBMITTED --START_REVIEW--> UNDER_REVIEW --SHORTLIST--> SHORTLISTED
 *   SHORTLISTED --OFFER--> OFFERED --ENROL--> ENROLLED --REVERSE_ENROLMENT--> ENROLMENT_REVERSED
 *   plus WITHDRAW (by the applicant) and REJECT (by the officer) where they make sense.
 *
 * The last arrow, out of ENROLLED, is the fix for design defect DR-07: the original design had no
 * way to undo an enrolment made by mistake. Only an ADMIN may take it, and a reason is mandatory.
 * Any arrow not in this table is refused.
 */
@Component
public class AdmissionStateMachine {

    /** One allowed arrow: from + action -> to, who may take it, and whether a reason must be given. */
    public record Transition(AdmissionStatus from, AdmissionAction action, AdmissionStatus to, Role role,
                             boolean reasonRequired) {
    }

    private static final List<Transition> TRANSITIONS = List.of(
            new Transition(DRAFT, SUBMIT, SUBMITTED, APPLICANT, false),
            new Transition(DRAFT, WITHDRAW, WITHDRAWN, APPLICANT, false),
            new Transition(SUBMITTED, WITHDRAW, WITHDRAWN, APPLICANT, false),
            new Transition(SUBMITTED, START_REVIEW, UNDER_REVIEW, ADMISSIONS_OFFICER, false),
            new Transition(UNDER_REVIEW, SHORTLIST, SHORTLISTED, ADMISSIONS_OFFICER, false),
            new Transition(UNDER_REVIEW, REJECT, REJECTED, ADMISSIONS_OFFICER, true),
            new Transition(SHORTLISTED, OFFER, OFFERED, ADMISSIONS_OFFICER, false),
            new Transition(SHORTLISTED, REJECT, REJECTED, ADMISSIONS_OFFICER, true),
            new Transition(OFFERED, ENROL, ENROLLED, ADMISSIONS_OFFICER, false),
            new Transition(OFFERED, WITHDRAW, WITHDRAWN, APPLICANT, false),
            new Transition(ENROLLED, REVERSE_ENROLMENT, ENROLMENT_REVERSED, ADMIN, true));

    /** Finds the arrow for this move, or explains exactly why the move is not allowed. */
    public Transition resolve(AdmissionStatus from, AdmissionAction action, Role role) {
        Transition transition = TRANSITIONS.stream()
                .filter(t -> t.from() == from && t.action() == action)
                .findFirst()
                .orElseThrow(() -> ApiException.conflict("ILLEGAL_TRANSITION",
                        "An application that is " + from + " cannot be " + action + "."));
        if (transition.role() != role) {
            throw ApiException.forbidden("Only " + transition.role() + " can " + action + " an application.");
        }
        return transition;
    }

    /** The actions this role may take from this state; the screen shows one button per action. */
    public List<AdmissionAction> allowedActions(AdmissionStatus from, Role role) {
        return TRANSITIONS.stream()
                .filter(t -> t.from() == from && t.role() == role)
                .map(Transition::action)
                .toList();
    }

    public List<Transition> all() {
        return TRANSITIONS;
    }
}
