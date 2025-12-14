package com.churchapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
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
                    logger.error("Firebase configuration file not found: {}", FIREBASE_CONFIG_PATH);
                    throw new IllegalStateException("Firebase configuration file not found");
                }

                try (InputStream serviceAccount = resource.getInputStream()) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();

                    FirebaseApp.initializeApp(options);
                    logger.info("Firebase Admin SDK initialized successfully");
                }
            } else {
                logger.info("Firebase Admin SDK already initialized");
            }
        } catch (IOException e) {
            logger.error("Failed to initialize Firebase Admin SDK", e);
            throw new IllegalStateException("Could not initialize Firebase", e);
        }
    }
}
