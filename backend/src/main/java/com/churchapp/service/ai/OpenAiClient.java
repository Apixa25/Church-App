package com.churchapp.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

/**
 * Thin wrapper around the OpenAI Chat Completions API using Structured Outputs.
 *
 * We only ever ask the model to fill in a strict JSON schema; the caller gets a
 * typed object back and never has to parse free text. When no API key is
 * configured the client reports {@link #isEnabled()} == false and callers fall
 * back to rule-based behaviour, so local development works without a key.
 *
 * Uses Spring 6.1 {@link RestClient} (built into Spring Boot 3.2) rather than a
 * separate SDK to keep the dependency surface small.
 */
@Service
@Slf4j
public class OpenAiClient {

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public OpenAiClient(
            ObjectMapper objectMapper,
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-4o-mini}") String model,
            @Value("${openai.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${openai.timeout-ms:10000}") long timeoutMs) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.model = model;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) timeoutMs);
        factory.setReadTimeout((int) timeoutMs);

        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .requestFactory(factory)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    public boolean isEnabled() {
        return !apiKey.isEmpty();
    }

    public String getModel() {
        return model;
    }

    /**
     * Ask the model to produce JSON matching {@code schema} and map it onto {@code type}.
     *
     * @param systemPrompt instructions + context (never contains raw user text from other users)
     * @param userPrompt   the text to interpret
     * @param schemaName   identifier for the schema (letters, digits, underscores)
     * @param schema       JSON schema object; must satisfy OpenAI strict-mode rules
     *                     (all properties required, additionalProperties=false)
     * @return the parsed object, or empty on any failure (disabled, network, refusal, parse error)
     */
    public <T> Optional<T> completeStructured(String systemPrompt, String userPrompt,
                                              String schemaName, JsonNode schema, Class<T> type) {
        if (!isEnabled()) {
            log.debug("OpenAI client disabled (no OPENAI_API_KEY); skipping structured completion");
            return Optional.empty();
        }

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("temperature", 0);

            ArrayNode messages = body.putArray("messages");
            messages.addObject().put("role", "system").put("content", systemPrompt);
            messages.addObject().put("role", "user").put("content", userPrompt);

            ObjectNode responseFormat = body.putObject("response_format");
            responseFormat.put("type", "json_schema");
            ObjectNode jsonSchema = responseFormat.putObject("json_schema");
            jsonSchema.put("name", schemaName);
            jsonSchema.put("strict", true);
            jsonSchema.set("schema", schema);

            JsonNode response = restClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .body(body)
                .retrieve()
                .body(JsonNode.class);

            if (response == null) {
                log.warn("OpenAI returned an empty response");
                return Optional.empty();
            }

            JsonNode message = response.path("choices").path(0).path("message");
            if (message.hasNonNull("refusal")) {
                log.warn("OpenAI refused the request: {}", message.get("refusal").asText());
                return Optional.empty();
            }

            String content = message.path("content").asText(null);
            if (content == null || content.isBlank()) {
                log.warn("OpenAI response had no content. finish_reason={}",
                    response.path("choices").path(0).path("finish_reason").asText());
                return Optional.empty();
            }

            JsonNode usage = response.path("usage");
            log.info("🤖 OpenAI structured completion ok: model={}, prompt_tokens={}, completion_tokens={}",
                model, usage.path("prompt_tokens").asInt(), usage.path("completion_tokens").asInt());

            return Optional.of(objectMapper.readValue(content, type));
        } catch (Exception e) {
            log.warn("OpenAI structured completion failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
