package com.pocketphrases.access;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutionException;

/**
 * Depends on Firestore via ObjectProvider (rather than a direct constructor
 * dependency) so this bean can exist even when the Firestore bean doesn't
 * (whitelist gate off) — isAllowed() simply denies in that case, and the
 * gate is never consulted anyway since WhitelistFilter short-circuits first.
 */
@Service
public class WhitelistService {

    private static final String COLLECTION = "whitelist";

    private final ObjectProvider<Firestore> firestoreProvider;

    public WhitelistService(ObjectProvider<Firestore> firestoreProvider) {
        this.firestoreProvider = firestoreProvider;
    }

    public boolean isAllowed(String email) {
        Firestore firestore = firestoreProvider.getIfAvailable();
        if (firestore == null) {
            return false;
        }
        try {
            QuerySnapshot result = firestore.collection(COLLECTION)
                    .whereEqualTo("email", email.toLowerCase())
                    .limit(1)
                    .get()
                    .get();
            return !result.isEmpty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (ExecutionException e) {
            return false;
        }
    }
}
