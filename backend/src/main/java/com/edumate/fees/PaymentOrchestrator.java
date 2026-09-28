package com.edumate.fees;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.academic.Student;
import com.edumate.academic.StudentRepository;
import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.notifications.NotificationService;
import com.edumate.security.CurrentUser;

/**
 * Starts payments and processes the gateway's callbacks (design element "PaymentOrchestrator", FR-08).
 *
 * The callback handler is IDEMPOTENT: receiving the same callback twice has the same effect as
 * receiving it once. Payment gateways really do resend callbacks (network retries), and the old
 * handler credited the fee a second time (design defect DR-02, test defect DEF-014:
 * Rs 62,500 paid, Rs 1,25,000 credited). Four guards now stop that:
 *   1. the signature must be valid (a forged callback is refused);
 *   2. the payment row is locked while the callback is processed (two copies cannot interleave);
 *   3. a payment already marked SUCCESS with the same bank reference is recognised and ignored;
 *   4. the database refuses a second payment or ledger credit with the same bank reference.
 * Steps 2-4 and the ledger credit all happen inside ONE transaction: all or nothing.
 */
@Service
public class PaymentOrchestrator {

    public static final String PROCESSED = "PROCESSED";
    public static final String DUPLICATE_IGNORED = "DUPLICATE_IGNORED";

    private final PaymentRepository payments;
    private final FeeDemandRepository demands;
    private final StudentRepository students;
    private final FeeLedger ledger;
    private final GatewaySignature signature;
    private final ReceiptNumberGenerator receipts;
    private final NotificationService notifications;
    private final AuditLogger auditLogger;
    private final Clock clock;

    public PaymentOrchestrator(PaymentRepository payments, FeeDemandRepository demands, StudentRepository students,
                               FeeLedger ledger, GatewaySignature signature, ReceiptNumberGenerator receipts,
                               NotificationService notifications, AuditLogger auditLogger, Clock clock) {
        this.payments = payments;
        this.demands = demands;
        this.students = students;
        this.ledger = ledger;
        this.signature = signature;
        this.receipts = receipts;
        this.notifications = notifications;
        this.auditLogger = auditLogger;
        this.clock = clock;
    }

    /** Step 1 of paying: create an order for the amount still due and send the user to the gateway. */
    @Transactional
    public InitiatedPayment initiate(CurrentUser me, Long feeDemandId) {
        Long studentId = me.requireStudentId();
        FeeDemand demand = demands.findById(feeDemandId)
                .filter(d -> d.getStudentId().equals(studentId))
                .orElseThrow(() -> ApiException.notFound("Fee demand"));
        BigDecimal due = demand.getAmount().subtract(payments.sumPaidForDemand(demand.getId()));
        if (due.signum() <= 0) {
            throw ApiException.conflict("ALREADY_PAID", "This fee has already been paid in full.");
        }
        String orderId = "ORD-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16)
                .toUpperCase(Locale.ROOT);
        Payment payment = payments.save(new Payment(studentId, demand.getId(), due, orderId, Instant.now(clock)));
        auditLogger.record(me.username(), "PAYMENT_INITIATED", "Payment", payment.getId(), null,
                orderId + " for " + due);
        return new InitiatedPayment(orderId, due, demand.getDescription(), "/pay/" + orderId);
    }

    /** Step 2 of paying: the gateway tells us how it went. Safe to call any number of times. */
    @Transactional
    public CallbackResult handleCallback(GatewayCallback callback) {
        if (!signature.verify(callback.orderId(), callback.txnRef(), callback.status(), callback.amount(),
                callback.signature())) {
            auditLogger.record("payment-gateway", "CALLBACK_REJECTED", "Payment", callback.orderId(), null,
                    "invalid signature");
            throw ApiException.badRequest("BAD_SIGNATURE", "The payment callback signature is invalid.");
        }
        Payment payment = payments.findByGatewayOrderIdForUpdate(callback.orderId())
                .orElseThrow(() -> ApiException.notFound("Payment order"));
        if (new BigDecimal(callback.amount()).compareTo(payment.getAmount()) != 0) {
            auditLogger.record("payment-gateway", "CALLBACK_REJECTED", "Payment", payment.getId(), null,
                    "amount mismatch " + callback.amount());
            throw ApiException.badRequest("AMOUNT_MISMATCH", "The callback amount does not match the order.");
        }

        boolean sameAsRecorded = callback.txnRef().equals(payment.getGatewayTxnRef());
        if (sameAsRecorded) {
            auditLogger.record("payment-gateway", "CALLBACK_DUPLICATE_IGNORED", "Payment", payment.getId(), null,
                    callback.txnRef());
            return result(DUPLICATE_IGNORED, payment);
        }
        if (payment.isSuccessful()) {
            auditLogger.record("payment-gateway", "CALLBACK_CONFLICT", "Payment", payment.getId(),
                    payment.getGatewayTxnRef(), callback.txnRef());
            throw ApiException.conflict("ALREADY_PAID",
                    "This order was already paid under another transaction; it has been flagged for reconciliation.");
        }

        Instant now = Instant.now(clock);
        if ("SUCCESS".equals(callback.status())) {
            capture(payment, callback, now);
        } else {
            String reason = callback.failureReason() == null ? "Declined by the bank" : callback.failureReason();
            payment.markFailed(callback.txnRef(), reason, now);
            auditLogger.record("payment-gateway", "PAYMENT_FAILED", "Payment", payment.getId(), null, reason);
        }
        payments.flush();   // unique constraints are checked here, inside the transaction
        return result(PROCESSED, payment);
    }

    private void capture(Payment payment, GatewayCallback callback, Instant now) {
        String receipt = receipts.next(payment, now);
        payment.markSuccess(callback.txnRef(), receipt, now);
        ledger.credit(payment.getStudentId(), payment.getAmount(), "Fee payment, receipt " + receipt,
                callback.txnRef());
        auditLogger.record("payment-gateway", "PAYMENT_CAPTURED", "Payment", payment.getId(), "INITIATED",
                "SUCCESS " + payment.getAmount() + " receipt " + receipt);
        Student student = students.findById(payment.getStudentId()).orElse(null);
        if (student != null) {
            notifications.enqueue(NotificationService.EMAIL, student.getEmail(), "Fee receipt " + receipt,
                    "We received Rs " + payment.getAmount() + " for " + student.getFullName() + ". Receipt: "
                            + receipt + ".", "receipt:" + receipt);
        }
    }

    private static CallbackResult result(String outcome, Payment payment) {
        return new CallbackResult(outcome, payment.getGatewayOrderId(), payment.getStatus(),
                payment.getReceiptNo(), payment.getFailureReason());
    }

    /** Returned by initiate(): where to send the user to pay. */
    public record InitiatedPayment(String orderId, BigDecimal amount, String description, String checkoutPath) {
    }

    /** Returned to the gateway (and shown on the demo gateway page). */
    public record CallbackResult(String outcome, String orderId, String paymentStatus, String receiptNo,
                                 String failureReason) {
    }
}
