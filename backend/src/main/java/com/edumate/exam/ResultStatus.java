package com.edumate.exam;

/**
 * The life of a result set, one step at a time:
 *
 *   DRAFT -> COMPUTED -> AWAITING_SECOND_APPROVAL -> APPROVED -> PUBLISHED
 *
 * Publishing needs two approvals by two DIFFERENT people (the "Safety" objective of the
 * SQA Plan: incorrect results must not reach students irreversibly).
 */
public enum ResultStatus {
    DRAFT,
    COMPUTED,
    AWAITING_SECOND_APPROVAL,
    APPROVED,
    PUBLISHED
}
