package com.edumate.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.PathContainer;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.util.pattern.PathPatternParser;

import com.edumate.IntegrationTestBase;

/**
 * Guards against design defect DR-06 / test defect DEF-031 ever coming back:
 * every URL that any EduMate controller answers must have an explicit line in the RoleMatrix.
 * A developer who adds an endpoint and forgets the matrix gets a failing build, not a data leak.
 */
class RoleMatrixCoverageTest extends IntegrationTestBase {

    @Autowired
    private RoleMatrix roleMatrix;

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping mappings;

    @Test
    @DisplayName("Every EduMate endpoint is listed in the RoleMatrix")
    void everyEndpointIsCovered() {
        List<String> uncovered = new ArrayList<>();
        for (Map.Entry<RequestMappingInfo, HandlerMethod> entry : mappings.getHandlerMethods().entrySet()) {
            if (!entry.getValue().getBeanType().getPackageName().startsWith("com.edumate")) {
                continue;
            }
            RequestMappingInfo info = entry.getKey();
            Set<String> patterns = info.getPathPatternsCondition().getPatternValues();
            Set<org.springframework.web.bind.annotation.RequestMethod> methods = info.getMethodsCondition().getMethods();
            for (String pattern : patterns) {
                String samplePath = pattern.replaceAll("\\{[^}]+}", "1");
                for (var method : methods) {
                    if (!covered(HttpMethod.valueOf(method.name()), samplePath)) {
                        uncovered.add(method + " " + pattern);
                    }
                }
            }
        }
        assertThat(uncovered).as("Endpoints missing from RoleMatrix").isEmpty();
    }

    private boolean covered(HttpMethod method, String path) {
        PathPatternParser parser = PathPatternParser.defaultInstance;
        return roleMatrix.rules().stream()
                .filter(rule -> rule.method() == null || rule.method().equals(method))
                .anyMatch(rule -> parser.parse(rule.pattern()).matches(PathContainer.parsePath(path)));
    }
}
