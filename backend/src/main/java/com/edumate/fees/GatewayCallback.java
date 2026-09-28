package com.edumate.fees;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * The JSON the payment gateway sends to POST /api/payments/gateway/callback, for example:
 * { "orderId": "ORD-1A2B...", "txnRef": "TXN000123456789", "status": "SUCCESS",
 *   "amount": "62500.00", "signature": "9f86d0...", "failureReason": null }
 */
public record GatewayCallback(
        @NotBlank String orderId,
        @NotBlank String txnRef,
        @NotBlank @Pattern(regexp = "SUCCESS|FAILURE") String status,
        @NotBlank @Pattern(regexp = "\\d+\\.\\d{2}") String amount,
        @NotBlank String signature,
        String failureReason) {
}
