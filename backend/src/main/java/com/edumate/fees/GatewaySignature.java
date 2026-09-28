package com.edumate.fees;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

import com.edumate.config.AppProperties;

/**
 * Proves that a payment callback really came from the gateway.
 *
 * The gateway and EduMate share a secret. The gateway computes
 *   signature = HMAC-SHA256(secret, "orderId|txnRef|status|amount")
 * and sends it with the callback. We compute the same thing; if even one character of the
 * callback was changed on the way, the two signatures differ and the callback is rejected.
 */
@Component
public class GatewaySignature {

    private static final String ALGORITHM = "HmacSHA256";

    private final byte[] secret;

    public GatewaySignature(AppProperties properties) {
        this.secret = properties.payment().gatewaySecret().getBytes(StandardCharsets.UTF_8);
    }

    public String sign(String orderId, String txnRef, String status, String amount) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret, ALGORITHM));
            byte[] digest = mac.doFinal(payload(orderId, txnRef, status, amount).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HMAC-SHA256 is not available", ex);
        }
    }

    /** Compares in constant time, so an attacker cannot learn the signature byte by byte from timing. */
    public boolean verify(String orderId, String txnRef, String status, String amount, String signature) {
        if (signature == null) {
            return false;
        }
        byte[] expected = sign(orderId, txnRef, status, amount).getBytes(StandardCharsets.UTF_8);
        byte[] given = signature.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, given);
    }

    private static String payload(String orderId, String txnRef, String status, String amount) {
        return orderId + "|" + txnRef + "|" + status + "|" + amount;
    }
}
