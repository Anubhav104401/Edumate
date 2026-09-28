package com.edumate.fees;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * One attempt to pay a fee demand through the payment gateway.
 * gatewayOrderId is our id for the attempt; gatewayTxnRef is the bank's id for the money movement.
 * Both are UNIQUE in the database.
 */
@Entity
@Table(name = "payment")
public class Payment {

    public static final String INITIATED = "INITIATED";
    public static final String SUCCESS = "SUCCESS";
    public static final String FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "fee_demand_id", nullable = false)
    private Long feeDemandId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String status = INITIATED;

    @Column(name = "gateway_order_id", nullable = false, unique = true)
    private String gatewayOrderId;

    @Column(name = "gateway_txn_ref", unique = true)
    private String gatewayTxnRef;

    @Column(name = "receipt_no", unique = true)
    private String receiptNo;

    @Column(name = "failure_reason")
    private String failureReason;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Payment() {
        // required by JPA
    }

    public Payment(Long studentId, Long feeDemandId, BigDecimal amount, String gatewayOrderId, Instant now) {
        this.studentId = studentId;
        this.feeDemandId = feeDemandId;
        this.amount = amount;
        this.gatewayOrderId = gatewayOrderId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void markSuccess(String txnRef, String receipt, Instant when) {
        this.status = SUCCESS;
        this.gatewayTxnRef = txnRef;
        this.receiptNo = receipt;
        this.failureReason = null;
        this.updatedAt = when;
    }

    public void markFailed(String txnRef, String reason, Instant when) {
        this.status = FAILED;
        this.gatewayTxnRef = txnRef;
        this.failureReason = reason;
        this.updatedAt = when;
    }

    public boolean isSuccessful() {
        return SUCCESS.equals(status);
    }

    public Long getId() {
        return id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public Long getFeeDemandId() {
        return feeDemandId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getStatus() {
        return status;
    }

    public String getGatewayOrderId() {
        return gatewayOrderId;
    }

    public String getGatewayTxnRef() {
        return gatewayTxnRef;
    }

    public String getReceiptNo() {
        return receiptNo;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
