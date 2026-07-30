package com.pocketphrases.access;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Off by default. Flip app.access.whitelist-enabled=true (env var
 * APP_ACCESS_WHITELIST_ENABLED) to require every request's X-User-Email
 * header to be present in the Firestore "whitelist" collection.
 */
@Component
public class AccessProperties {

    private final boolean whitelistEnabled;

    public AccessProperties(@Value("${app.access.whitelist-enabled:false}") boolean whitelistEnabled) {
        this.whitelistEnabled = whitelistEnabled;
    }

    public boolean whitelistEnabled() {
        return whitelistEnabled;
    }
}
