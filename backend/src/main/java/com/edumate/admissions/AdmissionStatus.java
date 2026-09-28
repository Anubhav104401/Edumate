package com.edumate.admissions;

/** Every state an admission application can be in (see AdmissionStateMachine for the arrows). */
public enum AdmissionStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    SHORTLISTED,
    OFFERED,
    ENROLLED,
    REJECTED,
    WITHDRAWN,
    ENROLMENT_REVERSED
}
