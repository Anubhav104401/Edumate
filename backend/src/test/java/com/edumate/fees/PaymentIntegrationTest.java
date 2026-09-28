package com.edumate.fees;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.edumate.IntegrationTestBase;

/** Fee payment through the gateway: TC-005, TC-006 and the fix for DEF-014. */
class PaymentIntegrationTest extends IntegrationTestBase {

    @Test
    @DisplayName("TC-005 + TC-006: pay Rs 62,500, gateway sends the success callback twice, ledger credited once")
    void replayedCallbackCreditsOnce() throws Exception {
        String student = bearer("student");
        String account = mvc.perform(get("/api/fees/me").header(HttpHeaders.AUTHORIZATION, student))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        Integer demandId = read(account, "$.demands[0].id");

        String order = mvc.perform(post("/api/fees/payments").header(HttpHeaders.AUTHORIZATION, student)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"feeDemandId\":" + demandId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(62500.00))
                .andReturn().getResponse().getContentAsString();
        String orderId = read(order, "$.orderId");

        String results = mvc.perform(post("/api/payments/gateway/mock/" + orderId + "/complete")
                        .header(HttpHeaders.AUTHORIZATION, student).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"success\":true,\"deliveries\":2}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        List<String> outcomes = read(results, "$[*].outcome");
        Assertions.assertThat(outcomes).containsExactly("PROCESSED", "DUPLICATE_IGNORED");
        String receipt = read(results, "$[0].receiptNo");
        Assertions.assertThat(receipt).startsWith("RCPT-");

        String after = mvc.perform(get("/api/fees/me").header(HttpHeaders.AUTHORIZATION, student))
                .andReturn().getResponse().getContentAsString();
        List<Double> credits = read(after, "$.ledger[?(@.type == 'CREDIT')].amount");
        Assertions.assertThat(credits).containsExactly(62500.00);
        Assertions.assertThat(((Number) read(after, "$.outstanding")).doubleValue()).isZero();

        mvc.perform(post("/api/fees/payments").header(HttpHeaders.AUTHORIZATION, student)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"feeDemandId\":" + demandId + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_PAID"));
    }

    @Test
    @DisplayName("A forged callback with a wrong signature is refused")
    void forgedCallbackIsRejected() throws Exception {
        mvc.perform(post("/api/payments/gateway/callback").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"orderId":"ORD-ANY","txnRef":"TXN1","status":"SUCCESS",
                                 "amount":"62500.00","signature":"00ff"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_SIGNATURE"));
    }
}
