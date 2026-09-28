package com.edumate.security;

/**
 * Every kind of person who can log in to EduMate.
 * EXAM_SUPERINTENDENT has its own, fully defined rights (the fix for requirement defect RR-07).
 */
public enum Role {
    ADMIN,
    EXAM_SUPERINTENDENT,
    FACULTY,
    ADMISSIONS_OFFICER,
    ACCOUNTS_OFFICER,
    LIBRARIAN,
    STUDENT,
    GUARDIAN,
    APPLICANT
}
