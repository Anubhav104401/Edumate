package com.edumate.admin;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.edumate.security.Role;
import com.edumate.security.RoleMatrix;

/** GET /api/admin/role-matrix - shows administrators exactly who may call which URL. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final RoleMatrix roleMatrix;

    public AdminController(RoleMatrix roleMatrix) {
        this.roleMatrix = roleMatrix;
    }

    /** HttpMethod is a class in Spring 7 (not an enum), so it is sent as its plain name, e.g. "GET". */
    @GetMapping("/role-matrix")
    public List<RuleView> roleMatrix() {
        return roleMatrix.rules().stream()
                .map(r -> new RuleView(r.method() == null ? null : r.method().name(), r.pattern(), r.access(), r.roles()))
                .toList();
    }

    /** One row of the matrix as JSON: { "method": "GET", "pattern": "/api/...", "access": "ROLES", "roles": [...] } */
    public record RuleView(String method, String pattern, RoleMatrix.Access access, List<Role> roles) {
    }
}
