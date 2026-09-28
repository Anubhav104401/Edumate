package com.edumate.admissions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import com.edumate.IntegrationTestBase;

/** TC-020 (guardian consent for a minor, fix for RR-02) and the scanned-document upload pipeline. */
class AdmissionConsentIntegrationTest extends IntegrationTestBase {

    private static final byte[] PDF = "%PDF-1.4\n%%EOF\n".getBytes(StandardCharsets.ISO_8859_1);
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};

    @Test
    @DisplayName("TC-020: a 17-year-old cannot submit until verifiable guardian consent is captured")
    void minorNeedsGuardianConsent() throws Exception {
        String rohan = bearer("applicant.minor");
        String app = mvc.perform(get("/api/admissions/my-application").header(HttpHeaders.AUTHORIZATION, rohan))
                .andExpect(jsonPath("$.minor").value(true))
                .andReturn().getResponse().getContentAsString();
        Integer id = read(app, "$.id");

        // A program disguised as a PDF is refused; the real documents are accepted.
        upload(rohan, id, "ID_PROOF", "id.pdf", new byte[]{'M', 'Z', 0, 0})
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE"));
        upload(rohan, id, "PHOTO", "photo.png", PNG).andExpect(status().isOk());
        upload(rohan, id, "ID_PROOF", "id.pdf", PDF).andExpect(status().isOk());
        upload(rohan, id, "MARKSHEET_12", "marks.pdf", PDF).andExpect(status().isOk());

        mvc.perform(post("/api/admissions/applications/" + id + "/transitions").header(HttpHeaders.AUTHORIZATION, rohan)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"SUBMIT\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("GUARDIAN_CONSENT_REQUIRED"));

        String consent = mvc.perform(post("/api/consent/applications/" + id + "/request")
                        .header(HttpHeaders.AUTHORIZATION, rohan))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        String otp = read(consent, "$.demoOtp");
        mvc.perform(post("/api/consent/applications/" + id + "/verify").header(HttpHeaders.AUTHORIZATION, rohan)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"otp\":\"" + otp + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("GRANTED"));

        mvc.perform(post("/api/admissions/applications/" + id + "/transitions").header(HttpHeaders.AUTHORIZATION, rohan)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"action\":\"SUBMIT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));
    }

    @Test
    void applicantsCannotSeeOtherApplications() throws Exception {
        String priya = bearer("applicant");
        String rohanApp = mvc.perform(get("/api/admissions/my-application")
                        .header(HttpHeaders.AUTHORIZATION, bearer("applicant.minor")))
                .andReturn().getResponse().getContentAsString();
        Integer rohansId = read(rohanApp, "$.id");
        mvc.perform(get("/api/admissions/applications/" + rohansId).header(HttpHeaders.AUTHORIZATION, priya))
                .andExpect(status().isNotFound());
    }

    private org.springframework.test.web.servlet.ResultActions upload(String token, Integer id, String type,
                                                                      String name, byte[] bytes) throws Exception {
        return mvc.perform(multipart("/api/admissions/applications/" + id + "/documents")
                .file(new MockMultipartFile("file", name, "application/octet-stream", bytes))
                .param("type", type)
                .header(HttpHeaders.AUTHORIZATION, token));
    }
}
