package com.edumate.fees;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.CurrentUser;

/**
 * The gateway-facing URLs.
 *  POST /api/payments/gateway/callback           called by the payment gateway (no login; HMAC-signed)
 *  GET  /api/payments/gateway/mock/{orderId}     demo bank page: order details
 *  POST /api/payments/gateway/mock/{orderId}/complete   demo bank page: "Pay" / "Decline" buttons
 */
@RestController
@RequestMapping("/api/payments/gateway")
public class PaymentGatewayController {

    private final PaymentOrchestrator orchestrator;
    private final MockPaymentGateway mockGateway;

    public PaymentGatewayController(PaymentOrchestrator orchestrator, MockPaymentGateway mockGateway) {
        this.orchestrator = orchestrator;
        this.mockGateway = mockGateway;
    }

    @PostMapping("/callback")
    public PaymentOrchestrator.CallbackResult callback(@Valid @RequestBody GatewayCallback callback) {
        return orchestrator.handleCallback(callback);
    }

    @GetMapping("/mock/{orderId}")
    public MockPaymentGateway.CheckoutView checkout(CurrentUser me, @PathVariable String orderId) {
        return mockGateway.checkout(orderId, me);
    }

    @PostMapping("/mock/{orderId}/complete")
    public List<PaymentOrchestrator.CallbackResult> complete(CurrentUser me, @PathVariable String orderId,
                                                             @Valid @RequestBody CompleteRequest request) {
        return mockGateway.complete(orderId, me, request.success(), request.deliveries());
    }

    /** success = the "bank" approves; deliveries = how many times the callback is sent (1 to 3). */
    public record CompleteRequest(boolean success, @Min(1) @Max(3) int deliveries) {
    }
}
