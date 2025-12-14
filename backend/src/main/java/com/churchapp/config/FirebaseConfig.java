package com.churchapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;

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
                ClassPathResource resource = new ClassPathResource(FIREBASE_CONFIG_PATH);

                if (!resource.exists()) {
                    logger.warn("Firebase configuration file not found: {}. Push notifications will be disabled.", FIREBASE_CONFIG_PATH);
                    logger.warn("To enable push notifications, ensure the Firebase credentials file is in the classpath.");
                    return; // Don't throw - let app start without notifications
                }

                try (InputStream serviceAccount = resource.getInputStream()) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
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
