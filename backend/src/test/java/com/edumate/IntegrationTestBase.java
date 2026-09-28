package com.edumate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

/**
 * Starts the whole backend in memory (no real network port) with the demo data loaded, and gives
 * tests a MockMvc "fake browser" to send HTTP requests through the real security filters and controllers.
 * All integration test classes share one application and one database, so each test uses its own users.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "edumate.storage.root=target/test-storage")
public abstract class IntegrationTestBase {

    @Autowired
    protected MockMvc mvc;

    /** Logs in through POST /api/auth/login and returns the "Bearer ..." header value. */
    protected String bearer(String username) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"Edumate@2026\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    protected static <T> T read(String json, String path) {
        return JsonPath.read(json, path);
    }
}
