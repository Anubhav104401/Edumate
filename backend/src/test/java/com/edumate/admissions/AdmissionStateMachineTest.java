package com.edumate.admissions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.edumate.common.ApiException;
import com.edumate.security.Role;

/** State transition testing of the admission lifecycle (Fig. 3.2 of the SQA report). */
class AdmissionStateMachineTest {

    private final AdmissionStateMachine machine = new AdmissionStateMachine();

    @Test
    void happyPathFromDraftToEnrolled() {
        AdmissionStatus s = AdmissionStatus.DRAFT;
        s = machine.resolve(s, AdmissionAction.SUBMIT, Role.APPLICANT).to();
        s = machine.resolve(s, AdmissionAction.START_REVIEW, Role.ADMISSIONS_OFFICER).to();
        s = machine.resolve(s, AdmissionAction.SHORTLIST, Role.ADMISSIONS_OFFICER).to();
        s = machine.resolve(s, AdmissionAction.OFFER, Role.ADMISSIONS_OFFICER).to();
        s = machine.resolve(s, AdmissionAction.ENROL, Role.ADMISSIONS_OFFICER).to();
        assertThat(s).isEqualTo(AdmissionStatus.ENROLLED);
    }

    @Test
    @DisplayName("DR-07: an enrolment made in error can be reversed, by an ADMIN, with a reason")
    void enrolmentCanBeReversed() {
        AdmissionStateMachine.Transition t =
                machine.resolve(AdmissionStatus.ENROLLED, AdmissionAction.REVERSE_ENROLMENT, Role.ADMIN);
        assertThat(t.to()).isEqualTo(AdmissionStatus.ENROLMENT_REVERSED);
        assertThat(t.reasonRequired()).isTrue();
        assertThatThrownBy(() -> machine.resolve(AdmissionStatus.ENROLLED, AdmissionAction.REVERSE_ENROLMENT,
                Role.ADMISSIONS_OFFICER)).isInstanceOf(ApiException.class).hasMessageContaining("Only ADMIN");
    }

    @Test
    void missingArrowsAreRefused() {
        assertThatThrownBy(() -> machine.resolve(AdmissionStatus.DRAFT, AdmissionAction.ENROL,
                Role.ADMISSIONS_OFFICER)).isInstanceOf(ApiException.class).hasMessageContaining("cannot be ENROL");
        assertThatThrownBy(() -> machine.resolve(AdmissionStatus.REJECTED, AdmissionAction.SUBMIT,
                Role.APPLICANT)).isInstanceOf(ApiException.class);
    }

    @Test
    void applicantsCannotTakeOfficerDecisions() {
        assertThatThrownBy(() -> machine.resolve(AdmissionStatus.UNDER_REVIEW, AdmissionAction.SHORTLIST,
                Role.APPLICANT)).isInstanceOf(ApiException.class).hasMessageContaining("Only ADMISSIONS_OFFICER");
    }

    @Test
    void buttonsShownDependOnStateAndRole() {
        assertThat(machine.allowedActions(AdmissionStatus.UNDER_REVIEW, Role.ADMISSIONS_OFFICER))
                .containsExactly(AdmissionAction.SHORTLIST, AdmissionAction.REJECT);
        assertThat(machine.allowedActions(AdmissionStatus.UNDER_REVIEW, Role.APPLICANT)).isEmpty();
    }

    @Test
    @DisplayName("Every state except the three end states has at least one way out")
    void noAccidentalDeadEnds() {
        for (AdmissionStatus status : AdmissionStatus.values()) {
            boolean terminal = status == AdmissionStatus.REJECTED || status == AdmissionStatus.WITHDRAWN
                    || status == AdmissionStatus.ENROLMENT_REVERSED;
            boolean hasExit = machine.all().stream().anyMatch(t -> t.from() == status);
            assertThat(hasExit).as(status.name()).isEqualTo(!terminal);
        }
    }
}
