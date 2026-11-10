package com.pocketphrases.roleplay;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import java.util.List;
import java.util.stream.IntStream;

/** The shape the model is constrained to via structured outputs, returned to the frontend after a sanity pass. */
public record RoleplayTurn(
        @JsonPropertyDescription("Your next line in the role, in the target language. 1-2 short, simple sentences.")
        String reply,
        @JsonPropertyDescription("The same line translated to Norwegian Bokmål")
        String replyNorwegian,
        @JsonPropertyDescription("If the user's last message was typed by them and had a language mistake: a short Norwegian Bokmål explanation with the correct form. Otherwise an empty string.")
        String correction,
        @JsonPropertyDescription("Exactly 4 answer options for what the user could say next, exactly one of them correct. Empty when done is true.")
        List<Option> options,
        @JsonPropertyDescription("true when the conversation has reached a natural end")
        boolean done
) {
    public record Option(
            @JsonPropertyDescription("The answer option in the target language")
            String text,
            @JsonPropertyDescription("The option translated to Norwegian Bokmål")
            String norwegian,
            @JsonPropertyDescription("true for the single natural, grammatically correct answer that fits the situation")
            boolean correct,
            @JsonPropertyDescription("Short Norwegian Bokmål feedback: why it's wrong (for wrong options) or a brief confirmation (for the correct one)")
            String feedback
    ) {
    }

    /**
     * The schema can't enforce "exactly one correct", so make sure of it here:
     * keep only the first option marked correct; if none is, the first option
     * becomes the correct one.
     */
    RoleplayTurn withExactlyOneCorrect() {
        if (options == null || options.isEmpty()) {
            return new RoleplayTurn(reply, replyNorwegian, correction, List.of(), done);
        }
        int correctIndex = 0;
        for (int i = 0; i < options.size(); i++) {
            if (options.get(i).correct()) {
                correctIndex = i;
                break;
            }
        }
        final int keep = correctIndex;
        List<Option> fixed = IntStream.range(0, options.size())
                .mapToObj(i -> {
                    Option o = options.get(i);
                    return new Option(o.text(), o.norwegian(), i == keep, o.feedback());
                })
                .toList();
        return new RoleplayTurn(reply, replyNorwegian, correction, fixed, done);
    }
}
