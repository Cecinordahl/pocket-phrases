package com.pocketphrases.lesson;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * A thematic tag used purely for the visual accent color / dot in the UI
 * (blue for travel, orange for food, etc). Independent of "mode" — mode
 * decides which pool a lesson is sampled from, category decides how a
 * phrase is color-coded once shown. Kept as a closed enum (rather than a
 * free string) so the frontend's color mapping never sees an unknown value,
 * even from AI-generated lessons via structured outputs.
 */
public enum PhraseCategory {
    @JsonProperty("reise") REISE,
    @JsonProperty("mat") MAT,
    @JsonProperty("sosialt") SOSIALT,
    @JsonProperty("transport") TRANSPORT,
    @JsonProperty("nodsituasjon") NODSITUASJON,
    @JsonProperty("handel") HANDEL,
    @JsonProperty("hoflighet") HOFLIGHET,
    @JsonProperty("annet") ANNET
}
