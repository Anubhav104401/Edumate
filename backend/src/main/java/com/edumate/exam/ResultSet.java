package com.edumate.exam;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** The results of one programme's semester in one exam session, e.g. "B.Tech CSE, semester 5, 2026-ODD". */
@Entity
@Table(name = "result_set")
public class ResultSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_session_id", nullable = false)
    private Long examSessionId;

    @Column(name = "program_id", nullable = false)
    private Long programId;

    @Column(nullable = false)
    private int semester;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResultStatus status = ResultStatus.DRAFT;

    @Column(name = "computed_at")
    private Instant computedAt;

    @Column(name = "computed_by")
    private String computedBy;

    @Column(name = "first_approver")
    private String firstApprover;

    @Column(name = "first_approved_at")
    private Instant firstApprovedAt;

    @Column(name = "second_approver")
    private String secondApprover;

    @Column(name = "second_approved_at")
    private Instant secondApprovedAt;

    @Column(name = "published_by")
    private String publishedBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Version
    private long version;

    protected ResultSet() {
        // required by JPA
    }

    public ResultSet(Long examSessionId, Long programId, int semester) {
        this.examSessionId = examSessionId;
        this.programId = programId;
        this.semester = semester;
    }

    /** (Re)computing wipes any earlier approvals: approvers must see the numbers they approve. */
    public void markComputed(String actor, Instant when) {
        this.status = ResultStatus.COMPUTED;
        this.computedBy = actor;
        this.computedAt = when;
        this.firstApprover = null;
        this.firstApprovedAt = null;
        this.secondApprover = null;
        this.secondApprovedAt = null;
    }

    public void recordFirstApproval(String actor, Instant when) {
        this.status = ResultStatus.AWAITING_SECOND_APPROVAL;
        this.firstApprover = actor;
        this.firstApprovedAt = when;
    }

    public void recordSecondApproval(String actor, Instant when) {
        this.status = ResultStatus.APPROVED;
        this.secondApprover = actor;
        this.secondApprovedAt = when;
    }

    /** A mark changed after computing: the computed numbers are out of date. */
    public void invalidate() {
        this.status = ResultStatus.DRAFT;
    }

    /** Only used by the demo seeder to create already-published history (approved by two people, then published). */
    public void markPublishedForHistory(String firstApprover, String secondApprover, Instant when) {
        this.computedBy = firstApprover;
        this.computedAt = when;
        this.firstApprover = firstApprover;
        this.firstApprovedAt = when;
        this.secondApprover = secondApprover;
        this.secondApprovedAt = when;
        this.status = ResultStatus.PUBLISHED;
        this.publishedBy = firstApprover;
        this.publishedAt = when;
    }

    public boolean isLockedForMarkChanges() {
        return status == ResultStatus.AWAITING_SECOND_APPROVAL
                || status == ResultStatus.APPROVED
                || status == ResultStatus.PUBLISHED;
    }

    public Long getId() {
        return id;
    }

    public Long getExamSessionId() {
        return examSessionId;
    }

    public Long getProgramId() {
        return programId;
    }

    public int getSemester() {
        return semester;
    }

    public ResultStatus getStatus() {
        return status;
    }

    public Instant getComputedAt() {
        return computedAt;
    }

    public String getComputedBy() {
        return computedBy;
    }

    public String getFirstApprover() {
        return firstApprover;
    }

    public Instant getFirstApprovedAt() {
        return firstApprovedAt;
    }

    public String getSecondApprover() {
        return secondApprover;
    }

    public Instant getSecondApprovedAt() {
        return secondApprovedAt;
    }

    public String getPublishedBy() {
        return publishedBy;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public long getVersion() {
        return version;
    }
}
