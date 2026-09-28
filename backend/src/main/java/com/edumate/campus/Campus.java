package com.edumate.campus;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A campus of the university. Each campus is one "tenant" of the platform. */
@Entity
@Table(name = "campus")
public class Campus {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String city;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Campus() {
        // required by JPA
    }

    public Campus(String code, String name, String city, Instant createdAt) {
        this.code = code;
        this.name = name;
        this.city = city;
        this.createdAt = createdAt;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
