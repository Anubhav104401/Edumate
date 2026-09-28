package com.edumate.notifications;

/**
 * Anything that can actually deliver an e-mail or SMS.
 * In production this would call the SMS / e-mail provider's API;
 * in this project LoggingNotificationGateway simply writes to the log.
 */
public interface NotificationGateway {

    /** Delivers one message; throws an exception if the provider refused it. */
    void send(NotificationMessage message);
}
