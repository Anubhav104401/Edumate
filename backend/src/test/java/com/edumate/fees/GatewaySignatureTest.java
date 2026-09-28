package com.edumate.fees;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.edumate.TestFixtures;

/** The HMAC signature that authenticates payment gateway callbacks. */
class GatewaySignatureTest {

    private final GatewaySignature signature = new GatewaySignature(TestFixtures.properties());

    @Test
    void aGenuineCallbackVerifies() {
        String sig = signature.sign("ORD-1", "TXN-9", "SUCCESS", "62500.00");
        assertThat(sig).hasSize(64);
        assertThat(signature.verify("ORD-1", "TXN-9", "SUCCESS", "62500.00", sig)).isTrue();
    }

    @Test
    void changingAnySingleFieldBreaksTheSignature() {
        String sig = signature.sign("ORD-1", "TXN-9", "SUCCESS", "62500.00");
        assertThat(signature.verify("ORD-1", "TXN-9", "SUCCESS", "625000.00", sig)).isFalse();
        assertThat(signature.verify("ORD-2", "TXN-9", "SUCCESS", "62500.00", sig)).isFalse();
        assertThat(signature.verify("ORD-1", "TXN-9", "FAILURE", "62500.00", sig)).isFalse();
        assertThat(signature.verify("ORD-1", "TXN-9", "SUCCESS", "62500.00", null)).isFalse();
    }
}
