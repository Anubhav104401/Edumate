package com.edumate.security;

import org.springframework.security.oauth2.jwt.Jwt;

import com.edumate.common.ApiException;

/**
 * "Who is making this request?" — read from the signed JWT the browser sent.
 * Controllers simply declare a CurrentUser parameter and receive this object
 * (see CurrentUserArgumentResolver).
 */
public record CurrentUser(Long id, String username, String fullName, Role role,
                          String campusCode, Long studentId) {

    /** Builds a CurrentUser from the claims inside a verified token. */
    public static CurrentUser from(Jwt jwt) {
        Object sid = jwt.getClaim("sid");
        return new CurrentUser(
                ((Number) jwt.getClaim("uid")).longValue(),
                jwt.getSubject(),
                jwt.getClaimAsString("name"),
                Role.valueOf(jwt.getClaimAsString("role")),
                jwt.getClaimAsString("campus"),
                sid == null ? null : ((Number) sid).longValue());
    }

    public boolean is(Role expected) {
        return role == expected;
    }

    /** The student this account may see: STUDENT = self, GUARDIAN = their child. */
    public Long requireStudentId() {
        if (studentId == null) {
            throw ApiException.forbidden("This account is not linked to a student record.");
        }
        return studentId;
    }
}
