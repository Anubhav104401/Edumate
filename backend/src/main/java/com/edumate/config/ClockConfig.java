package com.edumate.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * One shared clock for the whole backend.
 * Services ask this clock for "now" instead of calling LocalDate.now() directly,
 * so tests can replace it with a fixed clock and get repeatable results.
 */
@Configuration
public class ClockConfig {

    /** India Standard Time: the university's legal time zone. */
    public static final ZoneId CAMPUS_ZONE = ZoneId.of("Asia/Kolkata");

    @Bean
    public Clock clock() {
        return Clock.system(CAMPUS_ZONE);
    }
}
