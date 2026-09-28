package com.edumate.common;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.edumate.common.audit.AuditLogger;

/**
 * Catches every error thrown while handling a request and turns it into a
 * friendly ApiError JSON body with the right HTTP status code.
 * Internal details (stack traces, SQL) are only written to the server log,
 * tagged with a traceId the user can quote to support.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final AuditLogger auditLogger;

    public GlobalExceptionHandler(AuditLogger auditLogger) {
        this.auditLogger = auditLogger;
    }

    /** Errors our own services throw on purpose. */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest request) {
        return build(ex.getStatus(), ex.getCode(), ex.getMessage(), request, null);
    }

    /** A request body failed its @NotBlank / @Size / @Min ... rules. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",
                "Some fields are missing or invalid.", request, fields);
    }

    /** Two people edited the same record at once; the second save is refused (fix for DR-01). */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiError> handleStale(ObjectOptimisticLockingFailureException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "STALE_UPDATE",
                "Someone else changed this record while you were editing it. Reload and try again.", request, null);
    }

    /** A database UNIQUE or CHECK constraint stopped a bad write. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Integrity violation on {}: {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, "DUPLICATE_OR_INVALID",
                "This change conflicts with data that already exists.", request, null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleTooLarge(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return build(HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE",
                "The file is larger than the 5 MB limit.", request, null);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_JSON",
                "The request body is not valid JSON for this operation.", request, null);
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MissingServletRequestPartException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiError> handleBadParameter(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "BAD_PARAMETER",
                "A required parameter is missing or has the wrong type.", request, null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethod(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED",
                "This operation is not supported on this address.", request, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", "There is nothing at this address.", request, null);
    }

    /** A role check inside a service said no. The attempt is written to the audit log (TC-017). */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleDenied(AccessDeniedException ex, HttpServletRequest request) {
        String actor = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous";
        auditLogger.record(actor, "ACCESS_DENIED", "Endpoint", request.getMethod() + " " + request.getRequestURI(),
                null, null);
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to do this.", request, null);
    }

    /** Anything unexpected: log it with a reference number, tell the user only the reference. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        log.error("Unexpected error [traceId={}] on {} {}", traceId, request.getMethod(), request.getRequestURI(), ex);
        ApiError body = new ApiError(Instant.now(), 500, "INTERNAL_ERROR",
                "Something went wrong on our side. Please quote reference " + traceId + " to support.",
                request.getRequestURI(), traceId, null);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String code, String message,
                                           HttpServletRequest request, Map<String, String> fields) {
        ApiError body = new ApiError(Instant.now(), status.value(), code, message,
                request.getRequestURI(), null, fields);
        return ResponseEntity.status(status).body(body);
    }
}
