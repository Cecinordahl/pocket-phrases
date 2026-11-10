package com.pocketphrases.roleplay;

import java.util.List;

/**
 * Stateless: the frontend holds the conversation and sends all of it every
 * turn, so the backend needs no session storage or accounts.
 */
public record RoleplayRequest(String language, String scenario, List<Message> history) {

    public record Message(Role role, String text) {
    }

    public enum Role { user, assistant }
}
