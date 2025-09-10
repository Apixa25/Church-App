package com.churchapp.config;

import com.churchapp.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker to carry messages back to the client
        // on destinations prefixed with "/topic" and "/queue"
        config.enableSimpleBroker("/topic", "/queue");
        
        // Define prefix that will be used to filter messages to message-handling methods
        config.setApplicationDestinationPrefixes("/app");
        
        // Set user destination prefix for private messaging
        config.setUserDestinationPrefix("/user");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register STOMP endpoint and enable SockJS fallback options
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
        
        // Native WebSocket endpoint without SockJS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extract JWT token from WebSocket headers
                    List<String> authorization = accessor.getNativeHeader("Authorization");
                    
                    if (authorization != null && !authorization.isEmpty()) {
                        String token = authorization.get(0);
                        
                        if (token.startsWith("Bearer ")) {
                            token = token.substring(7);
                            
                            try {
                                // Validate token and extract email (username)
                                String email = jwtUtil.getEmailFromToken(token);
                                
                                if (email != null) {
                                    // Load user details first
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                                    
                                    // Then validate token with UserDetails
                                    if (jwtUtil.validateToken(token, userDetails)) {
                                        // Create authentication token
                                        UsernamePasswordAuthenticationToken auth = 
                                            new UsernamePasswordAuthenticationToken(
                                                userDetails, null, userDetails.getAuthorities());
                                        
                                        // Set authentication in security context
                                        SecurityContextHolder.getContext().setAuthentication(auth);
                                        
                                        // Set user principal for WebSocket session
                                        accessor.setUser(auth);
                                    }
                                }
                            } catch (Exception e) {
                                // Log authentication failure
                                System.err.println("WebSocket authentication failed: " + e.getMessage());
                            }
                        }
                    }
                }
                
                return message;
            }
        });
    }
}