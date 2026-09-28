package com.edumate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.edumate.config.AppProperties;
import com.edumate.security.CurrentUser;
import com.edumate.security.Role;

/** Small helpers shared by the unit tests. */
public final class TestFixtures {

    private TestFixtures() {
    }

    /** The same values as application.yml, built by hand so unit tests need no Spring. */
    public static AppProperties properties() {
        return new AppProperties(
                new AppProperties.Security("test-secret-test-secret-test-secret-123", 8, 5, 15, false),
                new AppProperties.Academic("R-2023", 75, 16),
                new AppProperties.Payment("test-gateway-secret"),
                new AppProperties.Storage("target/test-storage"),
                new AppProperties.Library(14, new BigDecimal("2.00"), new BigDecimal("200.00")),
                new AppProperties.Admissions(new BigDecimal("0.60"), new BigDecimal("0.40"),
                        Map.of("OBC", new BigDecimal("0.27"), "SC", new BigDecimal("0.15"),
                                "ST", new BigDecimal("0.075"))),
                new AppProperties.Demo(false, false),
                List.of(new AppProperties.Tenant("JGC", "Jain Global Campus", "Kanakapura")));
    }

    public static CurrentUser user(long id, String username, Role role, Long studentId) {
        return new CurrentUser(id, username, username, role, "JGC", studentId);
    }
}
