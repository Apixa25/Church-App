package com.churchapp.controller;

import com.churchapp.dto.AuthRequest;
import com.churchapp.dto.AuthResponse;
import com.churchapp.dto.LoginRequest;
import com.churchapp.dto.RefreshTokenRequest;
import com.churchapp.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.io.IOException;
import java.net.URLEncoder;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    
    private final AuthService authService;
    
    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;
    
    @RequestMapping(value = "/register", method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptionsRegister() {
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/test")
    public ResponseEntity<?> test() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "AuthController is working!");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }
    
    @GetMapping("/oauth2/success")
    public void handleOAuth2Success(@AuthenticationPrincipal OAuth2User oAuth2User, 
                                   HttpServletRequest request,
                                   HttpServletResponse response) throws IOException {
        try {
            log.info("OAuth2 success handler reached. Principal present: {}", oAuth2User != null);
            AuthResponse authResponse = authService.handleOAuth2Login(oAuth2User);
            
            // URL encode all parameters to handle special characters
            String token = URLEncoder.encode(authResponse.getToken(), StandardCharsets.UTF_8);
            String refreshToken = URLEncoder.encode(authResponse.getRefreshToken() != null ? authResponse.getRefreshToken() : "", StandardCharsets.UTF_8);
            String userId = URLEncoder.encode(authResponse.getUserId().toString(), StandardCharsets.UTF_8);
            String email = URLEncoder.encode(authResponse.getEmail(), StandardCharsets.UTF_8);
            String name = URLEncoder.encode(authResponse.getName(), StandardCharsets.UTF_8);
            String role = URLEncoder.encode(authResponse.getRole(), StandardCharsets.UTF_8);
            String profilePicUrl = URLEncoder.encode(authResponse.getProfilePicUrl() != null ? authResponse.getProfilePicUrl() : "", StandardCharsets.UTF_8);
            String isNewUser = String.valueOf(authResponse.isNewUser());
            
            String cleanFrontendUrl = resolveFrontendUrl(request);
            clearOAuthFrontendCookie(response);
            log.info("OAuth2 success redirecting to frontend origin: {}", cleanFrontendUrl);
            
            // Redirect to frontend with token as URL parameter
            String redirectUrl = String.format(
                "%s/auth/callback?token=%s&refreshToken=%s&userId=%s&email=%s&name=%s&role=%s&profilePicUrl=%s&isNewUser=%s",
                cleanFrontendUrl,
                token,
                refreshToken,
                userId,
                email,
                name,
                role,
                profilePicUrl,
                isNewUser
            );
            
            response.sendRedirect(redirectUrl);
        } catch (Exception e) {
            String cleanFrontendUrl = resolveFrontendUrl(request);
            clearOAuthFrontendCookie(response);
            log.error("OAuth2 success handling failed. Redirecting to auth error on {}", cleanFrontendUrl, e);
            String errorMessage = URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8);
            response.sendRedirect(cleanFrontendUrl + "/auth/error?message=" + errorMessage);
        }
    }
    
    @GetMapping("/oauth2/failure")
    public void handleOAuth2Failure(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String error = request.getParameter("error");
        String errorMessage = error != null ? error : "OAuth2 authentication failed";
        String encodedError = URLEncoder.encode(errorMessage, StandardCharsets.UTF_8);
        String cleanFrontendUrl = resolveFrontendUrl(request);
        clearOAuthFrontendCookie(response);
        log.warn("OAuth2 failure redirecting to frontend origin: {} with error: {}", cleanFrontendUrl, errorMessage);
        response.sendRedirect(cleanFrontendUrl + "/auth/error?message=" + encodedError);
    }

    private String resolveFrontendUrl(HttpServletRequest request) {
        String cookieFrontendUrl = getCookieValue(request, "oauth_frontend_url");
        if (cookieFrontendUrl != null && isAllowedFrontendOrigin(cookieFrontendUrl)) {
            return trimTrailingSlash(cookieFrontendUrl);
        }

        return trimTrailingSlash(frontendUrl);
    }

    private String getCookieValue(HttpServletRequest request, String cookieName) {
        if (request.getCookies() == null) {
            return null;
        }

        return Arrays.stream(request.getCookies())
            .filter(cookie -> cookieName.equals(cookie.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .map(value -> URLDecoder.decode(value, StandardCharsets.UTF_8))
            .orElse(null);
    }

    private boolean isAllowedFrontendOrigin(String origin) {
        String cleanOrigin = trimTrailingSlash(origin);
        return Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .map(this::trimTrailingSlash)
            .anyMatch(cleanOrigin::equals);
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return frontendUrl;
        }

        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private void clearOAuthFrontendCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("oauth_frontend_url", "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(false);
        response.addCookie(cookie);
    }
    
    @PostMapping("/apple")
    public ResponseEntity<?> handleAppleSignIn(@RequestBody Map<String, String> payload) {
        try {
            String idToken = payload.get("idToken");
            String appleUserId = payload.get("userId");
            String email = payload.get("email");
            String name = payload.get("name");

            if (idToken == null || idToken.isBlank()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Apple ID token is required");
                return ResponseEntity.badRequest().body(error);
            }

            // Apple only sends email and name on the FIRST authorization.
            // On subsequent sign-ins, we rely on the sub claim from the ID token.
            // The frontend decodes the JWT client-side and sends us the claims.
            if (email == null || email.isBlank()) {
                // Try to extract email from the JWT payload (base64-decode the middle segment)
                try {
                    String[] parts = idToken.split("\\.");
                    if (parts.length >= 2) {
                        String payloadJson = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        var claims = mapper.readTree(payloadJson);
                        if (claims.has("email")) {
                            email = claims.get("email").asText();
                        }
                        if (appleUserId == null && claims.has("sub")) {
                            appleUserId = claims.get("sub").asText();
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to decode Apple ID token: {}", e.getMessage());
                }
            }

            if (email == null || email.isBlank()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Could not determine email from Apple Sign-In");
                return ResponseEntity.badRequest().body(error);
            }

            AuthResponse authResponse = authService.handleAppleLogin(appleUserId, email, name);
            return ResponseEntity.ok(authResponse);
        } catch (Exception e) {
            log.error("Apple Sign-In failed: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Apple Sign-In failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal org.springframework.security.core.userdetails.User user) {
        Map<String, String> userInfo = new HashMap<>();
        userInfo.put("email", user.getUsername());
        userInfo.put("authorities", user.getAuthorities().toString());
        return ResponseEntity.ok(userInfo);
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // Since we're using stateless JWT, logout is handled on the client side
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        Map<String, Object> response = new HashMap<>();
        response.put("valid", true);
        response.put("message", "Token is valid");
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            AuthResponse response = authService.refreshToken(request.getRefreshToken());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }
}