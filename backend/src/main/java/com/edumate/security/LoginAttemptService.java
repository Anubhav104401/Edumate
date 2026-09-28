package com.edumate.security;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.edumate.common.ApiException;
import com.edumate.common.audit.AuditLogger;
import com.edumate.config.AppProperties;
import com.edumate.config.ClockConfig;

/**
 * Checks a username + password and enforces account lockout:
 * after 5 wrong passwords in a row the account is locked for 15 minutes
 * (fix for the OWASP A07 finding "no account lockout after repeated failures").
 */
@Service
public class LoginAttemptService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("hh:mm a");

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogger auditLogger;
    private final AppProperties properties;
    private final Clock clock;

    /** A bcrypt hash of a random string, checked when the username is unknown so both cases take equally long. */
    private final String dummyHash;

    public LoginAttemptService(AppUserRepository users, PasswordEncoder passwordEncoder,
                               AuditLogger auditLogger, AppProperties properties, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.auditLogger = auditLogger;
        this.properties = properties;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    /**
     * Returns the user when the password is right; throws ApiException otherwise.
     * noRollbackFor keeps the failed-attempt counter saved even though we throw.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public AppUser authenticate(String username, String rawPassword) {
        Instant now = Instant.now(clock);
        AppUser user = users.findByUsername(username.trim().toLowerCase()).orElse(null);

        if (user == null || !user.isEnabled()) {
            passwordEncoder.matches(rawPassword, dummyHash);   // same delay as a real check
            throw invalidCredentials();
        }

        if (user.isLockedAt(now)) {
            auditLogger.record(user.getUsername(), "LOGIN_BLOCKED_LOCKED", "AppUser", user.getId(), null, null);
            throw accountLocked(user.getLockedUntil());
        }

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            registerFailure(user, now);
            throw invalidCredentials();
        }

        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        auditLogger.record(user.getUsername(), "LOGIN_SUCCESS", "AppUser", user.getId(), null, null);
        return user;
    }

    private void registerFailure(AppUser user, Instant now) {
        int failures = user.getFailedAttempts() + 1;
        if (failures >= properties.security().maxFailedLogins()) {
            user.setFailedAttempts(0);
            user.setLockedUntil(now.plus(properties.security().lockoutMinutes(), ChronoUnit.MINUTES));
            auditLogger.record(user.getUsername(), "ACCOUNT_LOCKED", "AppUser", user.getId(), null,
                    "locked until " + user.getLockedUntil());
        } else {
            user.setFailedAttempts(failures);
            auditLogger.record(user.getUsername(), "LOGIN_FAILED", "AppUser", user.getId(), null,
                    "failed attempt " + failures);
        }
    }

    private static ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username or password.");
    }

    private static ApiException accountLocked(Instant until) {
        String at = LocalTime.ofInstant(until, ClockConfig.CAMPUS_ZONE).format(TIME);
        return new ApiException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                "Too many failed attempts. Your account is locked until " + at + ".");
    }
}
