package com.pocketphrases.roleplay;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import java.util.List;

/** The shape the model is constrained to via structured outputs, returned to the frontend as-is. */
public record RoleplayTurn(
        @JsonPropertyDescription("Your next line in the role, in the target language. 1-2 short, simple sentences.")
        String reply,
        @JsonPropertyDescription("The same line translated to Norwegian Bokmål")
        String replyNorwegian,
        @JsonPropertyDescription("If the user's last message had a language mistake: a short Norwegian Bokmål explanation with the correct form. Otherwise an empty string.")
        String correction,
        @JsonPropertyDescription("2-3 short suggestions, in the target language, for what the user could say next")
        List<String> hints,
        @JsonPropertyDescription("true when the conversation has reached a natural end")
        boolean done
) {
}
