package com.edumate.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Development stand-in for a real SMS / e-mail provider: it only prints the message to the log. */
@Component
public class LoggingNotificationGateway implements NotificationGateway {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationGateway.class);

    @Override
    public void send(NotificationMessage message) {
        log.info("[{}] to {} | {} | {}", message.getChannel(), message.getRecipient(),
                message.getSubject(), message.getBody());
    }
}
