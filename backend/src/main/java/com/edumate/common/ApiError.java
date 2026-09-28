package com.edumate.common;

import java.time.Instant;
import java.util.Map;

/**
 * The exact JSON shape of every error the backend returns, for example:
 * { "status": 409, "code": "STALE_UPDATE", "message": "...", "path": "/api/...", "traceId": "..." }
 * Stack traces are never included (OWASP A05, security misconfiguration).
 */
public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        String traceId,
        Map<String, String> fieldErrors) {
}
