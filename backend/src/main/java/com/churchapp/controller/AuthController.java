package com.churchapp.controller;

import com.churchapp.dto.AuthRequest;
import com.churchapp.dto.AuthResponse;
import com.churchapp.dto.LoginRequest;
import com.churchapp.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class AuthController {
    
    private final AuthService authService;
    
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
                                   HttpServletResponse response) throws IOException {
        try {
            AuthResponse authResponse = authService.handleOAuth2Login(oAuth2User);
            
            // Redirect to frontend with token as URL parameter
            String redirectUrl = String.format(
                "http://localhost:3000/auth/callback?token=%s&refreshToken=%s&userId=%s&email=%s&name=%s&role=%s&isNewUser=%s",
                authResponse.getToken(),
                authResponse.getRefreshToken(),
                authResponse.getUserId(),
                authResponse.getEmail(),
                authResponse.getName(),
                authResponse.getRole(),
                authResponse.isNewUser()
            );
            
            response.sendRedirect(redirectUrl);
        } catch (Exception e) {
            response.sendRedirect("http://localhost:3000/auth/error?message=" + e.getMessage());
        }
    }
    
    @GetMapping("/oauth2/failure")
    public void handleOAuth2Failure(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String error = request.getParameter("error");
        response.sendRedirect("http://localhost:3000/auth/error?message=" + (error != null ? error : "OAuth2 authentication failed"));
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
}