package com.edumate.security;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import com.edumate.config.AppProperties;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * The security guard at the door of every request (design element "SecurityFilterChain").
 *
 * 1. Reads the "Authorization: Bearer <token>" header and verifies the token's signature.
 * 2. Turns the token's "role" claim into a Spring authority such as ROLE_FACULTY.
 * 3. Asks the RoleMatrix whether that role may call the requested URL.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, RoleMatrix roleMatrix,
                                                   RestAuthHandlers handlers, AppProperties properties) {
        http
                // No cookies are used for login (the token travels in a header), so CSRF attacks
                // have nothing to ride on; CSRF protection is therefore switched off.
                .csrf(csrf -> csrf.disable())
                // Do not keep any server-side session; every request must bring its own token.
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(roleMatrix::applyTo)
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(handlers)
                        .accessDeniedHandler(handlers))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(handlers)
                        .accessDeniedHandler(handlers));

        if (properties.security().h2ConsoleEnabled()) {
            // The H2 web console draws itself inside frames from the same site.
            http.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
        }
        return http.build();
    }

    /** Maps the token claim role=FACULTY to the Spring authority ROLE_FACULTY. */
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("role");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    /** The secret key both signs and checks tokens (HMAC-SHA256 needs at least 32 bytes). */
    @Bean
    public SecretKey jwtSigningKey(AppProperties properties) {
        byte[] secret = properties.security().jwtSecret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("edumate.security.jwt-secret must be at least 32 bytes long");
        }
        return new SecretKeySpec(secret, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSigningKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSigningKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSigningKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSigningKey).macAlgorithm(MacAlgorithm.HS256).build();
    }

    /** bcrypt with cost factor 12: each password check deliberately takes ~0.25 s (OWASP A02). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
