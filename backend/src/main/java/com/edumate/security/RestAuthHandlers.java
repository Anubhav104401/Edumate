package com.edumate.security;

import java.io.IOException;
import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import com.edumate.common.ApiError;
import com.edumate.common.audit.AuditLogger;

import tools.jackson.databind.json.JsonMapper;

/**
 * What Spring Security sends back when it stops a request before it reaches a controller:
 * 401 when there is no valid token, 403 when the token's role is not allowed.
 * Both are written as the same ApiError JSON used everywhere else, and every 403
 * is recorded in the audit log (expected result of test case TC-017).
 */
@Component
public class RestAuthHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final JsonMapper jsonMapper;
    private final AuditLogger auditLogger;

    public RestAuthHandlers(JsonMapper jsonMapper, AuditLogger auditLogger) {
        this.jsonMapper = jsonMapper;
        this.auditLogger = auditLogger;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        write(response, request, 401, "UNAUTHENTICATED", "Your session has expired or you are not logged in.");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        String actor = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous";
        auditLogger.record(actor, "ACCESS_DENIED", "Endpoint",
                request.getMethod() + " " + request.getRequestURI(), null, null);
        write(response, request, 403, "FORBIDDEN", "You do not have permission to do this.");
    }

    private void write(HttpServletResponse response, HttpServletRequest request,
                       int status, String code, String message) throws IOException {
        ApiError body = new ApiError(Instant.now(), status, code, message, request.getRequestURI(), null, null);
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(jsonMapper.writeValueAsString(body));
    }
}
