package com.edumate.security;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.edumate.config.AppProperties;

/**
 * Creates the signed "wristband" (JWT) handed to a user after a successful login.
 * The token holds the user's id, role and campus, and is signed with HMAC-SHA256,
 * so any change to it by the browser makes the signature invalid.
 */
@Service
public class JwtTokenService {

    private final JwtEncoder encoder;
    private final AppProperties properties;
    private final Clock clock;

    public JwtTokenService(JwtEncoder encoder, AppProperties properties, Clock clock) {
        this.encoder = encoder;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedToken issue(AppUser user) {
        Instant now = Instant.now(clock);
        Instant expiresAt = now.plus(properties.security().tokenValidityHours(), ChronoUnit.HOURS);

        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer("edumate-backend")
                .subject(user.getUsername())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("uid", user.getId())
                .claim("name", user.getFullName())
                .claim("role", user.getRole().name())
                .claim("campus", user.getCampusCode());
        if (user.getStudentId() != null) {
            claims.claim("sid", user.getStudentId());
        }

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }

    /** The token text plus the moment it stops working. */
    public record IssuedToken(String value, Instant expiresAt) {
    }
}
