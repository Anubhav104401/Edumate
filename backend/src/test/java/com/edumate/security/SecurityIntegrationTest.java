package com.edumate.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.edumate.IntegrationTestBase;
import com.edumate.common.audit.AuditRepository;

/** Access control (OWASP A01), authentication (A07) and error handling (A05) through real HTTP calls. */
class SecurityIntegrationTest extends IntegrationTestBase {

    @Autowired
    private AuditRepository audit;

    @Test
    @DisplayName("TC-017 / DEF-031: a student asking for the consolidated marks report gets 403, and it is audited")
    void studentCannotReadCohortReport() throws Exception {
        String student = bearer("student2");
        mvc.perform(get("/api/reports/consolidated-marks").param("resultSetId", "1")
                        .header(HttpHeaders.AUTHORIZATION, student))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        Assertions.assertThat(audit.findAll())
                .anyMatch(e -> e.getActor().equals("student2") && e.getAction().equals("ACCESS_DENIED")
                        && e.getEntityId().contains("/api/reports/consolidated-marks"));
    }

    @Test
    void requestsWithoutATokenGet401() throws Exception {
        mvc.perform(get("/api/dashboard"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void aTamperedTokenIsRejected() throws Exception {
        String token = bearer("guardian");
        String tampered = token.substring(0, token.length() - 3) + "abc";
        mvc.perform(get("/api/dashboard").header(HttpHeaders.AUTHORIZATION, tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Endpoints missing from the matrix are refused even for an administrator (deny by default)")
    void unknownEndpointsAreDenied() throws Exception {
        mvc.perform(get("/api/secret-report").header(HttpHeaders.AUTHORIZATION, bearer("admin")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("OWASP A07: five wrong passwords lock the account")
    void accountLockout() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"ccc.admin\",\"password\":\"wrong-" + i + "\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Invalid username or password."));
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"ccc.admin\",\"password\":\"Edumate@2026\"}"))
                .andExpect(status().isLocked())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    @DisplayName("OWASP A05: error bodies never contain a stack trace")
    void errorsDoNotLeakInternals() throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString();
        Assertions.assertThat(body).contains("MALFORMED_JSON").doesNotContain("Exception").doesNotContain("at com.");
    }
}
