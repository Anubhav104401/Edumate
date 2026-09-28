package com.edumate.notifications;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for the notification outbox. */
public interface NotificationRepository extends JpaRepository<NotificationMessage, Long> {

    boolean existsByDedupKey(String dedupKey);

    List<NotificationMessage> findByStatusOrderByCreatedAt(String status, Pageable pageable);

    List<NotificationMessage> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
