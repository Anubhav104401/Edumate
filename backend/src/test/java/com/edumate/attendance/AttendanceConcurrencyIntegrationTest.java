package com.edumate.attendance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import com.edumate.IntegrationTestBase;

/** Fix for DR-01: two teachers editing the same register can no longer overwrite each other silently. */
class AttendanceConcurrencyIntegrationTest extends IntegrationTestBase {

    @Test
    @DisplayName("A save based on an old version of the register is refused with 409 STALE_UPDATE")
    void staleSaveIsRefused() throws Exception {
        String meera = bearer("meera.nair");
        String courses = mvc.perform(get("/api/academic/courses/mine").header(HttpHeaders.AUTHORIZATION, meera))
                .andReturn().getResponse().getContentAsString();
        Integer courseId = read(courses, "$[0].id");
        String date = LocalDate.now().minusDays(2).toString();

        String sheet = mvc.perform(get("/api/attendance/sessions").header(HttpHeaders.AUTHORIZATION, meera)
                        .param("courseId", courseId.toString()).param("section", "A")
                        .param("date", date).param("period", "6"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.alreadyTaken").value(false))
                .andReturn().getResponse().getContentAsString();
        List<Integer> ids = read(sheet, "$.rows[*].studentId");
        String marks = ids.stream().map(id -> "{\"studentId\":" + id + ",\"present\":true}")
                .collect(Collectors.joining(",", "[", "]"));
        String body = "{\"courseId\":%d,\"section\":\"A\",\"date\":\"%s\",\"period\":6,\"version\":%s,\"marks\":%s}";

        // Teacher 1 creates the register (version 0), then edits it (version 1).
        mvc.perform(put("/api/attendance/sessions").header(HttpHeaders.AUTHORIZATION, meera)
                        .contentType(MediaType.APPLICATION_JSON).content(body.formatted(courseId, date, "null", marks)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(0));
        mvc.perform(put("/api/attendance/sessions").header(HttpHeaders.AUTHORIZATION, meera)
                        .contentType(MediaType.APPLICATION_JSON).content(body.formatted(courseId, date, "0", marks)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));

        // Teacher 2 still holds version 0 on screen: their save is refused instead of overwriting.
        mvc.perform(put("/api/attendance/sessions").header(HttpHeaders.AUTHORIZATION, meera)
                        .contentType(MediaType.APPLICATION_JSON).content(body.formatted(courseId, date, "0", marks)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("STALE_UPDATE"));
    }

    @Test
    void teachersCannotTakeAttendanceForOtherTeachersCourses() throws Exception {
        String vikram = bearer("vikram.das");
        String meeraCourses = mvc.perform(get("/api/academic/courses/mine")
                        .header(HttpHeaders.AUTHORIZATION, bearer("meera.nair")))
                .andReturn().getResponse().getContentAsString();
        Integer meerasCourse = read(meeraCourses, "$[0].id");
        mvc.perform(get("/api/attendance/sessions").header(HttpHeaders.AUTHORIZATION, vikram)
                        .param("courseId", meerasCourse.toString()).param("section", "A")
                        .param("date", LocalDate.now().toString()).param("period", "1"))
                .andExpect(status().isForbidden());
    }
}
