package com.edumate.exam;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.edumate.IntegrationTestBase;
import com.edumate.TestFixtures;
import com.edumate.academic.ExamSessionRepository;
import com.edumate.academic.ProgramRepository;
import com.edumate.common.ApiException;
import com.edumate.security.Role;

/** Result computation (TC-013), two-person approval (Safety) and concurrent publication (TC-015, DEF-027). */
class ResultPublicationIntegrationTest extends IntegrationTestBase {

    @Autowired
    private ResultPublicationService publication;

    @Autowired
    private ProgramRepository programs;

    @Autowired
    private ExamSessionRepository examSessions;

    @Test
    @DisplayName("Compute, approve by two different people, publish once even when two people click at once")
    void fullPublicationWorkflow() throws Exception {
        long programId = programs.findByCampusCodeOrderByName("JGC").stream()
                .filter(p -> p.getCode().equals("BTCSE")).findFirst().orElseThrow().getId();
        long sessionId = examSessions.findByCode("2026-ODD").orElseThrow().getId();
        String compute = "{\"examSessionId\":" + sessionId + ",\"programId\":" + programId + ",\"semester\":5}";
        String examsup = bearer("examsup");

        // 1. One internal mark (Kiran Joshi, SQA) is still empty, so computing is refused.
        mvc.perform(post("/api/exams/result-sets/compute").header(HttpHeaders.AUTHORIZATION, examsup)
                        .contentType(MediaType.APPLICATION_JSON).content(compute))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MARKS_INCOMPLETE"));

        // 2. The SQA teacher enters it.
        String sneha = bearer("sneha.kulkarni");
        String courses = mvc.perform(get("/api/academic/courses/mine").header(HttpHeaders.AUTHORIZATION, sneha))
                .andReturn().getResponse().getContentAsString();
        Integer courseId = read(courses, "$[0].id");
        String sheet = mvc.perform(get("/api/exams/marks").header(HttpHeaders.AUTHORIZATION, sneha)
                        .param("courseId", courseId.toString()).param("examSessionId", String.valueOf(sessionId)))
                .andReturn().getResponse().getContentAsString();
        List<Integer> markIds = read(sheet, "$.lines[?(@.usn == '23BTRCS015')].markId");
        List<Integer> versions = read(sheet, "$.lines[?(@.usn == '23BTRCS015')].version");
        mvc.perform(put("/api/exams/marks/" + markIds.get(0)).header(HttpHeaders.AUTHORIZATION, sneha)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"internalMarks\":31,\"version\":" + versions.get(0) + ",\"reason\":\"IA-2 entered\"}"))
                .andExpect(status().isOk());

        // 3. Now computing works; Aarav's SGPA is 8.63 (TC-013).
        String summary = mvc.perform(post("/api/exams/result-sets/compute").header(HttpHeaders.AUTHORIZATION, examsup)
                        .contentType(MediaType.APPLICATION_JSON).content(compute))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.students").value(60))
                .andReturn().getResponse().getContentAsString();
        Integer resultSetId = read(summary, "$.resultSet.id");

        // 4. Two-person approval.
        mvc.perform(post("/api/exams/result-sets/" + resultSetId + "/publish").header(HttpHeaders.AUTHORIZATION, examsup))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("NOT_APPROVED"));
        mvc.perform(post("/api/exams/result-sets/" + resultSetId + "/approve").header(HttpHeaders.AUTHORIZATION, examsup))
                .andExpect(jsonPath("$.status").value("AWAITING_SECOND_APPROVAL"));
        mvc.perform(post("/api/exams/result-sets/" + resultSetId + "/approve").header(HttpHeaders.AUTHORIZATION, examsup))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SAME_APPROVER"));
        mvc.perform(post("/api/exams/result-sets/" + resultSetId + "/approve")
                        .header(HttpHeaders.AUTHORIZATION, bearer("examsup2")))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // 5. TC-015: two operators publish at the same instant; exactly one succeeds.
        List<String> outcomes = Collections.synchronizedList(new ArrayList<>());
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        for (String who : List.of("examsup", "examsup2")) {
            pool.submit(() -> {
                start.await();
                try {
                    publication.publish(resultSetId.longValue(),
                            TestFixtures.user(99, who, Role.EXAM_SUPERINTENDENT, null));
                    outcomes.add("PUBLISHED");
                } catch (ApiException ex) {
                    outcomes.add(ex.getCode());
                }
                return null;
            });
        }
        start.countDown();
        pool.shutdown();
        Assertions.assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();
        Assertions.assertThat(outcomes).containsExactlyInAnyOrder("PUBLISHED", "ALREADY_PUBLISHED");

        // 6. The student now sees semester 5 with SGPA 8.63.
        String mine = mvc.perform(get("/api/exams/results/me").header(HttpHeaders.AUTHORIZATION, bearer("student")))
                .andReturn().getResponse().getContentAsString();
        List<Double> sgpa = read(mine, "$[?(@.semester == 5)].sgpa");
        Assertions.assertThat(sgpa).containsExactly(8.63);
    }
}
