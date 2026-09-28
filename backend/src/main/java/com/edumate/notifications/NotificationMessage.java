package com.edumate.notifications;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One e-mail or SMS waiting in (or already sent from) the outbox.
 * Business code only ever writes rows here; the NotificationDispatcher sends them later.
 */
@Entity
@Table(name = "notification_outbox")
public class NotificationMessage {

    public static final String PENDING = "PENDING";
    public static final String SENT = "SENT";
    public static final String FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String channel;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String body;

    @Column(nullable = false)
    private String status = PENDING;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "dedup_key", nullable = false, unique = true)
    private String dedupKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    protected NotificationMessage() {
        // required by JPA
    }

    public NotificationMessage(String channel, String recipient, String subject, String body,
                               String dedupKey, Instant createdAt) {
        this.channel = channel;
        this.recipient = recipient;
        this.subject = subject;
        this.body = body;
        this.dedupKey = dedupKey;
        this.createdAt = createdAt;
    }

    public void markSent(Instant when) {
        this.status = SENT;
        this.sentAt = when;
        this.attempts++;
    }

    public void markAttemptFailed(int maxAttempts) {
        this.attempts++;
        if (attempts >= maxAttempts) {
            this.status = FAILED;
        }
    }

    public Long getId() {
        return id;
    }

    public String getChannel() {
        return channel;
    }

    public String getRecipient() {
        return recipient;
    }

    public String getSubject() {
        return subject;
    }

    public String getBody() {
        return body;
    }

    public String getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }

    public String getDedupKey() {
        return dedupKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getSentAt() {
        return sentAt;
    }
}
