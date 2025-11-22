package com.churchapp.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Jackson Configuration for proper timestamp serialization and deserialization
 * Ensures LocalDateTime objects are serialized/deserialized as ISO-8601 strings instead of arrays
 */
@Configuration
public class JacksonConfig {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JacksonConfig.class);

    // Use ISO-8601 format for better frontend compatibility
    // Serialization format (output): without milliseconds for consistency
    public static final String DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
    public static final DateTimeFormatter SERIALIZATION_FORMATTER = DateTimeFormatter.ofPattern(DATE_TIME_FORMAT);
    
    // Deserialization formats (input): accepts both with and without milliseconds
    // Format 1: "2025-11-28T18:00:00.000" (with milliseconds)
    public static final DateTimeFormatter FORMAT_WITH_MILLIS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");
    // Format 2: "2025-11-28T18:00:00" (without milliseconds)
    public static final DateTimeFormatter FORMAT_WITHOUT_MILLIS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    /**
     * Custom deserializer that handles LocalDateTime with optional milliseconds
     * Tries to parse with milliseconds first, then falls back to format without milliseconds
     */
    public static class FlexibleLocalDateTimeDeserializer extends StdDeserializer<LocalDateTime> {
        
        public FlexibleLocalDateTimeDeserializer() {
            super(LocalDateTime.class);
        }

        @Override
        public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            String dateString = p.getText().trim();
            
            // Try parsing with milliseconds first (format: "2025-11-28T18:00:00.000")
            try {
                return LocalDateTime.parse(dateString, FORMAT_WITH_MILLIS);
            } catch (DateTimeParseException e) {
                // If that fails, try without milliseconds (format: "2025-11-28T18:00:00")
                try {
                    return LocalDateTime.parse(dateString, FORMAT_WITHOUT_MILLIS);
                } catch (DateTimeParseException e2) {
                    // If both fail, throw a more descriptive error
                    throw new IOException(
                        String.format("Cannot deserialize value of type `java.time.LocalDateTime` from String \"%s\": " +
                            "Expected format 'yyyy-MM-dd'T'HH:mm:ss' or 'yyyy-MM-dd'T'HH:mm:ss.SSS'", dateString), e2);
                }
            }
        }
    }

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        log.info("🔧 Creating custom ObjectMapper with ISO-8601 date serialization");
        log.info("📅 Date format - Serialization: {} (without milliseconds)", DATE_TIME_FORMAT);
        log.info("📅 Date format - Deserialization: accepts 'yyyy-MM-dd'T'HH:mm:ss' or 'yyyy-MM-dd'T'HH:mm:ss.SSS'");
        JavaTimeModule javaTimeModule = new JavaTimeModule();
        
        // Custom LocalDateTime serializer (output): format without milliseconds for consistency
        javaTimeModule.addSerializer(LocalDateTime.class, new LocalDateTimeSerializer(SERIALIZATION_FORMATTER));
        
        // Custom LocalDateTime deserializer (input): accepts dates with or without milliseconds
        javaTimeModule.addDeserializer(LocalDateTime.class, new FlexibleLocalDateTimeDeserializer());
        
        return Jackson2ObjectMapperBuilder.json()
                .modules(javaTimeModule)
                .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();
    }
}
