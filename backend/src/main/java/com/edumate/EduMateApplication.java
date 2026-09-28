package com.edumate;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * The starting point of the whole backend.
 * Running this class starts an embedded web server on port 8080,
 * connects to the database, runs the Flyway migrations and wires
 * every @Service / @RestController together.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
@EnableScheduling
public class EduMateApplication {

    public static void main(String[] args) {
        SpringApplication.run(EduMateApplication.class, args);
    }
}
