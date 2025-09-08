package com.churchapp.service;

import com.churchapp.dto.AuthRequest;
import com.churchapp.dto.AuthResponse;
import com.churchapp.dto.LoginRequest;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    
    public AuthResponse register(AuthRequest request) {
        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("User already exists with email: " + request.getEmail());
        }
        
        // Create new user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.UserRole.MEMBER);
        user.setIsActive(true);
        
        User savedUser = userRepository.save(user);
        
        // Generate tokens
        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getId(), savedUser.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(savedUser.getEmail());
        
        return new AuthResponse(
            token,
            refreshToken,
            savedUser.getEmail(),
            savedUser.getId(),
            savedUser.getName(),
            savedUser.getRole().name(),
            savedUser.getProfilePicUrl(),
            true
        );
    }
    
    public AuthResponse login(LoginRequest request) {
        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            
            // Get user details
            User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            
            // Generate tokens
            String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRole().name());
            String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());
            
            return new AuthResponse(
                token,
                refreshToken,
                user.getEmail(),
                user.getId(),
                user.getName(),
                user.getRole().name(),
                user.getProfilePicUrl(),
                false
            );
            
        } catch (AuthenticationException e) {
            throw new RuntimeException("Invalid email or password");
        }
    }
    
    public AuthResponse handleOAuth2Login(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleId = oAuth2User.getAttribute("sub");
        String pictureUrl = oAuth2User.getAttribute("picture");
        
        Optional<User> existingUser = userRepository.findByEmail(email);
        User user;
        boolean isNewUser = false;
        
        if (existingUser.isPresent()) {
            user = existingUser.get();
            // Update Google ID if not set
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
            }
            // Update profile picture if available
            if (pictureUrl != null && user.getProfilePicUrl() == null) {
                user.setProfilePicUrl(pictureUrl);
            }
        } else {
            // Create new user
            user = new User();
            user.setEmail(email);
            user.setName(name);
            user.setGoogleId(googleId);
            user.setProfilePicUrl(pictureUrl);
            user.setRole(User.UserRole.MEMBER);
            user.setIsActive(true);
            isNewUser = true;
        }
        
        user.setLastLogin(LocalDateTime.now());
        User savedUser = userRepository.save(user);
        
        // Generate tokens
        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getId(), savedUser.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(savedUser.getEmail());
        
        return new AuthResponse(
            token,
            refreshToken,
            savedUser.getEmail(),
            savedUser.getId(),
            savedUser.getName(),
            savedUser.getRole().name(),
            savedUser.getProfilePicUrl(),
            isNewUser
        );
    }
}