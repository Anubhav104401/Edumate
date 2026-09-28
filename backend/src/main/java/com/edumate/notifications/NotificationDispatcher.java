package com.edumate.notifications;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Every 5 seconds, picks up to 50 pending messages from the outbox and hands them to the gateway
 * (design element "NotificationDispatcher").
 *
 * Keeping sending separate from computing is the fix for design defect DR-08: result computation
 * used to send notifications itself, so a slow SMS provider could slow down or break result
 * computation. Now computation only writes an outbox row, which takes microseconds.
 */
@Component
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);
    private static final int MAX_ATTEMPTS = 3;

    private final NotificationRepository repository;
    private final NotificationGateway gateway;
    private final Clock clock;

    public NotificationDispatcher(NotificationRepository repository, NotificationGateway gateway, Clock clock) {
        this.repository = repository;
        this.gateway = gateway;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "PT5S", initialDelayString = "PT10S")
    @Transactional
    public void dispatchPending() {
        List<NotificationMessage> batch =
                repository.findByStatusOrderByCreatedAt(NotificationMessage.PENDING, PageRequest.of(0, 50));
        for (NotificationMessage message : batch) {
            try {
                gateway.send(message);
                message.markSent(Instant.now(clock));
            } catch (RuntimeException ex) {
                log.warn("Sending notification {} failed: {}", message.getId(), ex.getMessage());
                message.markAttemptFailed(MAX_ATTEMPTS);
            }
        }
    }
}
