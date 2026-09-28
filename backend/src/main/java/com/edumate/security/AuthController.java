package com.edumate.security;

import java.time.Instant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /api/auth/login  -> checks the password, returns a signed token.
 * GET  /api/auth/me     -> "who am I?" for the token that was sent.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final LoginAttemptService loginAttemptService;
    private final JwtTokenService tokenService;

    public AuthController(LoginAttemptService loginAttemptService, JwtTokenService tokenService) {
        this.loginAttemptService = loginAttemptService;
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        AppUser user = loginAttemptService.authenticate(request.username(), request.password());
        JwtTokenService.IssuedToken token = tokenService.issue(user);
        MeResponse me = new MeResponse(user.getId(), user.getUsername(), user.getFullName(),
                user.getRole(), user.getCampusCode(), user.getStudentId());
        return new LoginResponse(token.value(), token.expiresAt(), me);
    }

    @GetMapping("/me")
    public MeResponse me(CurrentUser me) {
        return new MeResponse(me.id(), me.username(), me.fullName(), me.role(), me.campusCode(), me.studentId());
    }

    /** What the login form sends. */
    public record LoginRequest(
            @NotBlank(message = "Username is required.") @Size(max = 60) String username,
            @NotBlank(message = "Password is required.") @Size(max = 100) String password) {
    }

    /** What a successful login returns. */
    public record LoginResponse(String token, Instant expiresAt, MeResponse user) {
    }

    /** Public facts about the logged-in user. */
    public record MeResponse(Long id, String username, String fullName, Role role,
                             String campusCode, Long studentId) {
    }
}
