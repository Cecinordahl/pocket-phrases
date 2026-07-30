package com.pocketphrases.access;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Only created when app.access.whitelist-enabled=true, so running the app
 * with the gate off (the v1 default) never requires Firebase credentials.
 *
 * Credentials come from the FIREBASE_SERVICE_ACCOUNT_JSON env var (the raw
 * service-account JSON contents, easiest to set on Render/Vercel-style
 * platforms with no persistent file storage), falling back to Application
 * Default Credentials (GOOGLE_APPLICATION_CREDENTIALS pointing at a file)
 * for local development.
 */
@Configuration
public class FirestoreConfig {

    @Bean
    @ConditionalOnProperty(prefix = "app.access", name = "whitelist-enabled", havingValue = "true")
    public Firestore firestore(@Value("${firebase.service-account-json:}") String serviceAccountJson) throws IOException {
        GoogleCredentials credentials = serviceAccountJson.isBlank()
                ? GoogleCredentials.getApplicationDefault()
                : GoogleCredentials.fromStream(
                        new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8)));

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();
        FirebaseApp app = FirebaseApp.getApps().isEmpty()
                ? FirebaseApp.initializeApp(options)
                : FirebaseApp.getInstance();
        return FirestoreClient.getFirestore(app);
    }
}
