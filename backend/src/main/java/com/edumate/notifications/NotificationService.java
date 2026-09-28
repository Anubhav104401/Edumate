package com.edumate.notifications;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The only way business code queues a message.
 * A "dedup key" (for example "shortfall:12:5:2026-W40") makes sure the same
 * message is never queued twice, however many times the caller asks.
 */
@Service
public class NotificationService {

    public static final String EMAIL = "EMAIL";
    public static final String SMS = "SMS";

    private final NotificationRepository repository;
    private final Clock clock;

    public NotificationService(NotificationRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    /** Returns true if a new message was queued, false if an identical one was already there. */
    @Transactional
    public boolean enqueue(String channel, String recipient, String subject, String body, String dedupKey) {
        if (recipient == null || recipient.isBlank() || repository.existsByDedupKey(dedupKey)) {
            return false;
        }
        repository.save(new NotificationMessage(channel, recipient, subject, body, dedupKey, Instant.now(clock)));
        return true;
    }
}
