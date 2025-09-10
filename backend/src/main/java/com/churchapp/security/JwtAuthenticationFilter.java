package com.churchapp.security;

import com.churchapp.service.UserDetailsServiceImpl;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        final String requestURI = request.getRequestURI();
        
        // Skip JWT processing for OAuth2 endpoints - they use their own authentication
        if (requestURI.startsWith("/api/auth/oauth2/") || 
            requestURI.startsWith("/api/oauth2/") ||
            requestURI.startsWith("/oauth2/")) {
            logger.debug("Skipping JWT authentication for OAuth2 endpoint: " + requestURI);
            filterChain.doFilter(request, response);
            return;
        }
        
        final String authorizationHeader = request.getHeader("Authorization");
        
        // Log authentication attempt for debugging
        logger.debug("Processing request to: " + requestURI + " with Authorization header: " + 
                    (authorizationHeader != null ? "Present" : "Missing"));
        
        String email = null;
        String jwt = null;
        
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            logger.debug("Extracted JWT token from Authorization header");
            
            try {
                email = jwtUtil.getEmailFromToken(jwt);
                logger.debug("Successfully extracted email from JWT: " + email);
            } catch (ExpiredJwtException e) {
                logger.warn("JWT token is expired for request: " + requestURI);
            } catch (SignatureException e) {
                logger.error("JWT signature does not match for request: " + requestURI);
            } catch (Exception e) {
                logger.error("JWT token parsing failed for request: " + requestURI, e);
            }
        } else {
            logger.debug("No Bearer token found in Authorization header for request: " + requestURI);
        }
        
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            logger.debug("Loading user details for email: " + email);
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(email);
            
            if (jwtUtil.validateToken(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authenticationToken = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                logger.debug("Successfully authenticated user: " + email + " for request: " + requestURI);
            } else {
                logger.warn("JWT token validation failed for user: " + email + " on request: " + requestURI);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}