package com.edumate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

/**
 * Compatibility objective of the SQA Plan: the same schema, seed data and queries must work on
 * PostgreSQL (production) and not only on H2 (development). This test starts a real PostgreSQL 17
 * server inside the test run, points the backend at it, and exercises the trickiest queries.
 */
class PostgresCompatibilityTest extends IntegrationTestBase {

    private static final EmbeddedPostgres POSTGRES = start();

    private static EmbeddedPostgres start() {
        try {
            return EmbeddedPostgres.builder().start();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    @DynamicPropertySource
    static void usePostgres(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("spring.h2.console.enabled", () -> "false");
    }

    @AfterAll
    static void stop() throws IOException {
        POSTGRES.close();
    }

    @Test
    @DisplayName("Flyway schema, demo seed and the main queries all work on PostgreSQL 17")
    void mainFlowsRunOnPostgres() throws Exception {
        String student = bearer("student");
        mvc.perform(get("/api/attendance/me").header(HttpHeaders.AUTHORIZATION, student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[2].percent").value(75.00));
        mvc.perform(get("/api/exams/hall-ticket/me").header(HttpHeaders.AUTHORIZATION, student))
                .andExpect(status().isOk());
        mvc.perform(get("/api/exams/results/me").header(HttpHeaders.AUTHORIZATION, student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4));
        mvc.perform(get("/api/fees/me").header(HttpHeaders.AUTHORIZATION, student))
                .andExpect(jsonPath("$.outstanding").value(62500.00));

        String officer = bearer("admissions");
        mvc.perform(get("/api/admissions/applications").header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admissions/applications").param("status", "SUBMITTED").param("q", "app")
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(status().isOk());

        String faculty = bearer("meera.nair");
        String courses = mvc.perform(get("/api/academic/courses/mine").header(HttpHeaders.AUTHORIZATION, faculty))
                .andReturn().getResponse().getContentAsString();
        Integer courseId = read(courses, "$[0].id");
        mvc.perform(get("/api/attendance/courses/" + courseId + "/shortfall").header(HttpHeaders.AUTHORIZATION, faculty))
                .andExpect(status().isOk());

        mvc.perform(get("/api/library/books").param("q", "code").header(HttpHeaders.AUTHORIZATION, bearer("librarian")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Clean Code"));

        String admin = bearer("admin");
        mvc.perform(get("/api/timetable/workload").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk());
        mvc.perform(get("/api/dashboard").header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk());

        // Computing results exercises the cohort-wide JPQL join and the bulk delete.
        mvc.perform(post("/api/exams/result-sets/compute").header(HttpHeaders.AUTHORIZATION, bearer("examsup"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"examSessionId\":5,\"programId\":1,\"semester\":5}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MARKS_INCOMPLETE"));
    }
}
