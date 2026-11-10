package com.pocketphrases.generate;

/** imageBase64 is the raw base64 data (no "data:" prefix); mediaType e.g. "image/jpeg". */
public record ImageLessonRequest(String language, String imageBase64, String mediaType) {
}
