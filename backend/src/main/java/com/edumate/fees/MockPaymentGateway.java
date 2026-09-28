package com.edumate.fees;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.common.ApiException;
import com.edumate.security.CurrentUser;

/**
 * A pretend bank, used in place of a real payment gateway's sandbox.
 * It builds exactly the signed callback a real gateway would send and hands it to
 * PaymentOrchestrator.handleCallback, the same method behind the public callback URL.
 *
 * "deliveries" lets the demo send the SAME callback up to 3 times, reproducing test case TC-006
 * (replay the success callback): the fee must still be credited only once.
 */
@Service
public class MockPaymentGateway {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final PaymentRepository payments;
    private final PaymentOrchestrator orchestrator;
    private final GatewaySignature signature;

    public MockPaymentGateway(PaymentRepository payments, PaymentOrchestrator orchestrator,
                              GatewaySignature signature) {
        this.payments = payments;
        this.orchestrator = orchestrator;
        this.signature = signature;
    }

    @Transactional(readOnly = true)
    public CheckoutView checkout(String orderId, CurrentUser me) {
        Payment payment = ownPayment(orderId, me);
        return new CheckoutView(payment.getGatewayOrderId(), payment.getAmount(), payment.getStatus());
    }

    /** Not @Transactional on purpose: every delivery runs in its own transaction, like real HTTP calls. */
    public List<PaymentOrchestrator.CallbackResult> complete(String orderId, CurrentUser me, boolean success,
                                                             int deliveries) {
        if (deliveries < 1 || deliveries > 3) {
            throw ApiException.badRequest("BAD_DELIVERIES", "Deliveries must be between 1 and 3.");
        }
        Payment payment = ownPayment(orderId, me);
        String txnRef = "TXN" + String.format("%012d", Math.abs(RANDOM.nextLong() % 1_000_000_000_000L));
        String status = success ? "SUCCESS" : "FAILURE";
        String amount = payment.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString();
        GatewayCallback callback = new GatewayCallback(orderId, txnRef, status, amount,
                signature.sign(orderId, txnRef, status, amount),
                success ? null : "Card declined by the issuing bank");

        List<PaymentOrchestrator.CallbackResult> results = new ArrayList<>();
        for (int i = 0; i < deliveries; i++) {
            results.add(orchestrator.handleCallback(callback));
        }
        return results;
    }

    private Payment ownPayment(String orderId, CurrentUser me) {
        Long studentId = me.requireStudentId();
        return payments.findByGatewayOrderId(orderId)
                .filter(p -> p.getStudentId().equals(studentId))
                .orElseThrow(() -> ApiException.notFound("Payment order"));
    }

    /** What the pretend bank page shows before you click Pay. */
    public record CheckoutView(String orderId, BigDecimal amount, String status) {
    }
}
