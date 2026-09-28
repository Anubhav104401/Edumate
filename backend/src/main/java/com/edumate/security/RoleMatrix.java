package com.edumate.security;

import static com.edumate.security.Role.ACCOUNTS_OFFICER;
import static com.edumate.security.Role.ADMIN;
import static com.edumate.security.Role.ADMISSIONS_OFFICER;
import static com.edumate.security.Role.APPLICANT;
import static com.edumate.security.Role.EXAM_SUPERINTENDENT;
import static com.edumate.security.Role.FACULTY;
import static com.edumate.security.Role.GUARDIAN;
import static com.edumate.security.Role.LIBRARIAN;
import static com.edumate.security.Role.STUDENT;
import static org.springframework.http.HttpMethod.DELETE;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.http.HttpMethod.PUT;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.stereotype.Component;

import com.edumate.config.AppProperties;

/**
 * The single, complete list of "which role may call which endpoint" (design element RoleMatrix).
 *
 * Anything NOT listed here is refused for everyone (deny by default). This is the fix for
 * design defect DR-06 / test defect DEF-031, where two report endpoints were missing from the
 * matrix and quietly fell back to "any logged-in user may call it".
 */
@Component
public class RoleMatrix {

    /** How a rule grants access. */
    public enum Access { PUBLIC, ANY_AUTHENTICATED, ROLES }

    /** One line of the matrix: HTTP method + URL pattern + who may call it. */
    public record Rule(HttpMethod method, String pattern, Access access, List<Role> roles) {
    }

    private final List<Rule> rules = new ArrayList<>();

    public RoleMatrix(AppProperties properties) {
        // ---- Public: no token needed ----
        open(POST, "/api/auth/login");
        open(POST, "/api/payments/gateway/callback");     // protected by an HMAC signature instead
        open(GET, "/actuator/health");
        open(GET, "/actuator/info");
        open(null, "/error");
        if (properties.security().h2ConsoleEnabled()) {
            open(null, "/h2-console/**");
        }

        // ---- Any logged-in user ----
        anyUser(GET, "/api/auth/me");
        anyUser(GET, "/api/dashboard");
        anyUser(GET, "/api/academic/programs");

        // ---- Academic structure ----
        allow(GET, "/api/academic/courses/mine", FACULTY, STUDENT, GUARDIAN);
        allow(GET, "/api/academic/courses", ADMIN, EXAM_SUPERINTENDENT);
        allow(GET, "/api/academic/courses/*/students", FACULTY, ADMIN, EXAM_SUPERINTENDENT);
        allow(GET, "/api/academic/exam-sessions", ADMIN, EXAM_SUPERINTENDENT, FACULTY);
        allow(GET, "/api/academic/students", ADMIN, EXAM_SUPERINTENDENT, ACCOUNTS_OFFICER, LIBRARIAN);

        // ---- Attendance ----
        allow(GET, "/api/attendance/sessions", FACULTY);
        allow(PUT, "/api/attendance/sessions", FACULTY);
        allow(GET, "/api/attendance/me", STUDENT, GUARDIAN);
        allow(GET, "/api/attendance/courses/*/summary", FACULTY, ADMIN, EXAM_SUPERINTENDENT);
        allow(GET, "/api/attendance/courses/*/shortfall", FACULTY, ADMIN, EXAM_SUPERINTENDENT);
        allow(POST, "/api/attendance/courses/*/notify-guardians", FACULTY, ADMIN);

        // ---- Examinations and results ----
        allow(GET, "/api/exams/marks", FACULTY);
        allow(PUT, "/api/exams/marks/*", FACULTY);
        allow(GET, "/api/exams/hall-ticket/me", STUDENT, GUARDIAN);
        allow(GET, "/api/exams/results/me", STUDENT, GUARDIAN);
        allow(GET, "/api/exams/result-sets", EXAM_SUPERINTENDENT, ADMIN);
        allow(POST, "/api/exams/result-sets/compute", EXAM_SUPERINTENDENT);
        allow(POST, "/api/exams/result-sets/*/approve", EXAM_SUPERINTENDENT);
        allow(POST, "/api/exams/result-sets/*/publish", EXAM_SUPERINTENDENT);

        // ---- Reports (the two endpoints of DEF-031, now explicitly restricted) ----
        allow(GET, "/api/reports/consolidated-marks", EXAM_SUPERINTENDENT, ADMIN);
        allow(GET, "/api/reports/attendance-shortfall", EXAM_SUPERINTENDENT, ADMIN);

        // ---- Fees and payments ----
        allow(GET, "/api/fees/me", STUDENT, GUARDIAN);
        allow(POST, "/api/fees/payments", STUDENT, GUARDIAN);
        allow(GET, "/api/fees/payments", ACCOUNTS_OFFICER, ADMIN);
        allow(GET, "/api/fees/payments/*", STUDENT, GUARDIAN, ACCOUNTS_OFFICER, ADMIN);
        allow(GET, "/api/fees/ledger", ACCOUNTS_OFFICER, ADMIN);
        allow(GET, "/api/payments/gateway/mock/*", STUDENT, GUARDIAN);
        allow(POST, "/api/payments/gateway/mock/*/complete", STUDENT, GUARDIAN);

        // ---- Admissions, documents and consent ----
        allow(GET, "/api/admissions/my-application", APPLICANT);
        allow(POST, "/api/admissions/applications", APPLICANT);
        allow(GET, "/api/admissions/applications", ADMISSIONS_OFFICER, ADMIN);
        allow(PUT, "/api/admissions/applications/*", APPLICANT);
        allow(GET, "/api/admissions/applications/*", APPLICANT, ADMISSIONS_OFFICER, ADMIN);
        allow(POST, "/api/admissions/applications/*/transitions", APPLICANT, ADMISSIONS_OFFICER, ADMIN);
        allow(POST, "/api/admissions/applications/*/documents", APPLICANT);
        allow(GET, "/api/admissions/applications/*/documents", APPLICANT, ADMISSIONS_OFFICER, ADMIN);
        allow(GET, "/api/admissions/documents/*/content", APPLICANT, ADMISSIONS_OFFICER, ADMIN);
        allow(DELETE, "/api/admissions/documents/*", APPLICANT);
        allow(GET, "/api/admissions/merit-list", ADMISSIONS_OFFICER, ADMIN);
        allow(POST, "/api/consent/applications/*/request", APPLICANT);
        allow(POST, "/api/consent/applications/*/verify", APPLICANT);
        allow(GET, "/api/consent/applications/*", APPLICANT, ADMISSIONS_OFFICER, ADMIN);
        allow(POST, "/api/consent/*/revoke", APPLICANT, ADMIN);

        // ---- Timetable ----
        allow(POST, "/api/timetable/generate", ADMIN);
        allow(GET, "/api/timetable", ADMIN, FACULTY, EXAM_SUPERINTENDENT);
        allow(PUT, "/api/timetable/entries/*", ADMIN);
        allow(GET, "/api/timetable/clashes", ADMIN);
        allow(POST, "/api/timetable/publish", ADMIN);
        allow(GET, "/api/timetable/me", STUDENT, GUARDIAN, FACULTY);
        allow(GET, "/api/timetable/workload", ADMIN);

        // ---- Library ----
        allow(GET, "/api/library/books", LIBRARIAN, STUDENT, FACULTY, ADMIN);
        allow(GET, "/api/library/loans/me", STUDENT, GUARDIAN);
        allow(GET, "/api/library/loans", LIBRARIAN, ADMIN);
        allow(POST, "/api/library/loans", LIBRARIAN);
        allow(POST, "/api/library/loans/*/return", LIBRARIAN);

        // ---- Administration ----
        allow(GET, "/api/notifications/outbox", ADMIN);
        allow(GET, "/api/audit", ADMIN, EXAM_SUPERINTENDENT);
        allow(GET, "/api/admin/role-matrix", ADMIN);
    }

    /** Hands every rule to Spring Security, then refuses everything else. */
    public void applyTo(AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry auth) {
        for (Rule rule : rules) {
            var url = rule.method() == null
                    ? auth.requestMatchers(rule.pattern())
                    : auth.requestMatchers(rule.method(), rule.pattern());
            switch (rule.access()) {
                case PUBLIC -> url.permitAll();
                case ANY_AUTHENTICATED -> url.authenticated();
                case ROLES -> url.hasAnyRole(rule.roles().stream().map(Enum::name).toArray(String[]::new));
            }
        }
        auth.anyRequest().denyAll();
    }

    /** A read-only copy, shown to administrators at GET /api/admin/role-matrix. */
    public List<Rule> rules() {
        return List.copyOf(rules);
    }

    private void open(HttpMethod method, String pattern) {
        rules.add(new Rule(method, pattern, Access.PUBLIC, List.of()));
    }

    private void anyUser(HttpMethod method, String pattern) {
        rules.add(new Rule(method, pattern, Access.ANY_AUTHENTICATED, List.of()));
    }

    private void allow(HttpMethod method, String pattern, Role... roles) {
        rules.add(new Rule(method, pattern, Access.ROLES, List.of(roles)));
    }
}
