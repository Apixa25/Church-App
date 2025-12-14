package com.churchapp.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.InputStream;

/**
 * Firebase Cloud Messaging (FCM) Configuration
 * Initializes Firebase Admin SDK for push notifications
 * Fetches credentials securely from AWS Secrets Manager
 */
@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);
    private static final String SECRET_NAME = "church-app/firebase-credentials";

    @Value("${cloud.aws.region.static:us-west-2}")
    private String awsRegion;

    @PostConstruct
    public void initialize() {
        try {
            // Check if FirebaseApp is already initialized
            if (FirebaseApp.getApps().isEmpty()) {
                logger.info("Fetching Firebase credentials from AWS Secrets Manager...");

                String credentialsJson = getSecretFromSecretsManager();

                if (credentialsJson == null || credentialsJson.trim().isEmpty()) {
                    logger.warn("Firebase credentials not found in AWS Secrets Manager. Push notifications will be disabled.");
                    logger.warn("To enable push notifications, ensure credentials are stored in Secrets Manager: {}", SECRET_NAME);
                    return; // Don't throw - let app start without notifications
                }

                try (InputStream serviceAccount = new ByteArrayInputStream(credentialsJson.getBytes())) {
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

    /**
     * Fetches Firebase credentials from AWS Secrets Manager
     * @return JSON string containing Firebase credentials
     */
    private String getSecretFromSecretsManager() {
        try {
            // Create Secrets Manager client
            try (SecretsManagerClient client = SecretsManagerClient.builder()
                    .region(Region.of(awsRegion))
                    .build()) {

                GetSecretValueRequest request = GetSecretValueRequest.builder()
                        .secretId(SECRET_NAME)
                        .build();

                GetSecretValueResponse response = client.getSecretValue(request);
                return response.secretString();
            }
        } catch (Exception e) {
            logger.error("Failed to retrieve Firebase credentials from Secrets Manager", e);
            return null;
        }
    }
}
