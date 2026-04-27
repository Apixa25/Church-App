package com.churchapp.config;

import com.churchapp.security.JwtUtil;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.User;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.UserRepository;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    private static final Pattern GROUP_TOPIC_PATTERN =
        Pattern.compile("^/topic/group/([0-9a-fA-F-]{36})(?:/.*)?$");

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    
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
                    if (accessor.getUser() == null) {
                        throw new AccessDeniedException("Valid authentication is required for WebSocket connections");
                    }
                }

                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    authorizeSubscription(accessor);
                }
                
                return message;
            }
        });
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        Matcher matcher = GROUP_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            return;
        }

        Principal principal = accessor.getUser();
        if (principal == null || principal.getName() == null) {
            throw new AccessDeniedException("Authentication is required to subscribe to chat groups");
        }

        UUID groupId = UUID.fromString(matcher.group(1));
        User user = userRepository.findByEmail(principal.getName())
            .orElseThrow(() -> new AccessDeniedException("Authenticated WebSocket user was not found"));
        Optional<ChatGroup> chatGroup = chatGroupRepository.findById(groupId);

        boolean isActiveMember = chatGroup
            .map(group -> chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(user, group))
            .orElse(false);

        if (!isActiveMember) {
            throw new AccessDeniedException("User is not allowed to subscribe to this chat group");
        }
    }
}