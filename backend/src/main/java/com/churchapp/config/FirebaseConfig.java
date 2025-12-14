package com.churchapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Base64;

/**
 * Firebase Cloud Messaging (FCM) Configuration
 * Initializes Firebase Admin SDK for push notifications
 */
@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);
    private static final String FIREBASE_CONFIG_PATH = "thegathering-42de7-firebase-adminsdk-fbsvc-6a5e5d4bc7.json";

    @PostConstruct
    public void initialize() {
        try {
            // Check if FirebaseApp is already initialized
            if (FirebaseApp.getApps().isEmpty()) {
                logger.info("Initializing Firebase Admin SDK from classpath resource...");

                // Try to load from classpath (will be in JAR)
                InputStream serviceAccount = getClass().getClassLoader().getResourceAsStream(FIREBASE_CONFIG_PATH);

                if (serviceAccount == null) {
                    logger.warn("Firebase configuration file not found: {}. Push notifications will be disabled.", FIREBASE_CONFIG_PATH);
                    logger.warn("To enable push notifications, ensure the Firebase credentials file is in src/main/resources/");
                    return; // Don't throw - let app start without notifications
                }

                try (InputStream is = serviceAccount) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(is))
                            .build();

                    FirebaseApp.initializeApp(options);
                    logger.info("✅ Firebase Admin SDK initialized successfully - Push notifications enabled");
                }
            } else {
                logger.info("Firebase Admin SDK already initialized");
            }
        } catch (Exception e) {
            logger.error("❌ Failed to initialize Firebase Admin SDK - Push notifications will be disabled", e);
            logger.error("Error details: {}", e.getMessage());
            // Don't throw - let the app start without push notifications
        }
    }
}
