package com.edumate.notifications;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/notifications/outbox — administrators can see every queued and sent message. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/outbox")
    public List<NotificationMessage> outbox() {
        return repository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 200));
    }
}
