package com.churchapp.config;

import com.churchapp.security.JwtUtil;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.PrayerAccessPolicy;
import com.churchapp.service.PrayerTopics;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.converter.DefaultContentTypeResolver;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;
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
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    private static final Pattern GROUP_TOPIC_PATTERN =
        Pattern.compile("^/topic/group/([0-9a-fA-F-]{36})(?:/.*)?$");

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final PrayerAccessPolicy prayerAccessPolicy;
    private final ObjectMapper objectMapper;

    @Value("${cors.allowed-origins:*}")
    private String allowedOrigins;
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // In-memory broker. Sufficient for a single instance; switch to a STOMP relay
        // (RabbitMQ / Amazon MQ) or Redis when scaling Elastic Beanstalk past one instance.
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = resolveAllowedOrigins();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .withSockJS();
        
        // Native WebSocket endpoint without SockJS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins);
    }

    /**
     * Use the application's ObjectMapper for STOMP payloads so timestamps and nulls are serialized
     * exactly like the REST API (ISO-8601 strings instead of Jackson's default numeric arrays).
     */
    @Override
    public boolean configureMessageConverters(List<MessageConverter> messageConverters) {
        DefaultContentTypeResolver resolver = new DefaultContentTypeResolver();
        resolver.setDefaultMimeType(MimeTypeUtils.APPLICATION_JSON);

        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(objectMapper);
        converter.setContentTypeResolver(resolver);

        messageConverters.add(converter);
        return false;
    }

    private String[] resolveAllowedOrigins() {
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            return new String[]{"*"};
        }
        String[] origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toArray(String[]::new);
        return origins.length == 0 ? new String[]{"*"} : origins;
    }
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    return message;
                }
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    List<String> authorization = accessor.getNativeHeader("Authorization");
                    
                    if (authorization != null && !authorization.isEmpty()) {
                        String token = authorization.get(0);
                        
                        if (token.startsWith("Bearer ")) {
                            token = token.substring(7);
                            
                            try {
                                String email = jwtUtil.getEmailFromToken(token);
                                
                                if (email != null) {
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                                    
                                    if (jwtUtil.validateToken(token, userDetails)) {
                                        UsernamePasswordAuthenticationToken auth = 
                                            new UsernamePasswordAuthenticationToken(
                                                userDetails, null, userDetails.getAuthorities());
                                        
                                        SecurityContextHolder.getContext().setAuthentication(auth);
                                        accessor.setUser(auth);
                                    }
                                }
                            } catch (Exception e) {
                                log.warn("WebSocket authentication failed: {}", e.getMessage());
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

        Matcher groupMatcher = GROUP_TOPIC_PATTERN.matcher(destination);
        if (groupMatcher.matches()) {
            authorizeGroupSubscription(accessor, destination, UUID.fromString(groupMatcher.group(1)));
            return;
        }

        Matcher orgPrayersMatcher = PrayerTopics.ORGANIZATION_PRAYERS_PATTERN.matcher(destination);
        if (orgPrayersMatcher.matches()) {
            authorizeChurchPrayerSubscription(accessor, destination, UUID.fromString(orgPrayersMatcher.group(1)));
            return;
        }

        Matcher prayerMatcher = PrayerTopics.PRAYER_INTERACTIONS_PATTERN.matcher(destination);
        if (prayerMatcher.matches()) {
            authorizePrayerInteractionSubscription(accessor, destination, UUID.fromString(prayerMatcher.group(1)));
        }
    }

    private User requireSubscriber(StompHeaderAccessor accessor, String what) {
        Principal principal = accessor.getUser();
        if (principal == null || principal.getName() == null) {
            throw new AccessDeniedException("Authentication is required to subscribe to " + what);
        }
        return userRepository.findByEmail(principal.getName())
            .orElseThrow(() -> new AccessDeniedException("Authenticated WebSocket user was not found"));
    }

    /** A church's prayer feed is only for that church's members (platform admins may observe). */
    private void authorizeChurchPrayerSubscription(StompHeaderAccessor accessor, String destination, UUID organizationId) {
        User user = requireSubscriber(accessor, "prayer updates");
        boolean isPlatformAdmin = user.getRole() == User.Role.PLATFORM_ADMIN;
        boolean isOwnChurch = organizationId.equals(prayerAccessPolicy.churchIdOf(user));
        if (!isPlatformAdmin && !isOwnChurch) {
            log.debug("Rejected subscription by {} to {}", user.getEmail(), destination);
            throw new AccessDeniedException("Prayer updates stay with your church");
        }
    }

    /** Reactions/comments on a prayer are visible to the prayer's church only. */
    private void authorizePrayerInteractionSubscription(StompHeaderAccessor accessor, String destination, UUID prayerRequestId) {
        User user = requireSubscriber(accessor, "prayer interactions");
        Optional<PrayerRequest> prayer = prayerRequestRepository.findById(prayerRequestId);
        boolean allowed = prayer.map(p -> prayerAccessPolicy.canView(p, user)).orElse(false);
        if (!allowed) {
            log.debug("Rejected subscription by {} to {}", user.getEmail(), destination);
            throw new AccessDeniedException("Prayer interactions stay with your church");
        }
    }

    private void authorizeGroupSubscription(StompHeaderAccessor accessor, String destination, UUID groupId) {
        User user = requireSubscriber(accessor, "chat groups");
        Optional<ChatGroup> chatGroup = chatGroupRepository.findById(groupId);

        boolean isActiveMember = chatGroup
            .map(group -> chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(user, group))
            .orElse(false);

        if (!isActiveMember) {
            log.debug("Rejected subscription by {} to {}", user.getEmail(), destination);
            throw new AccessDeniedException("User is not allowed to subscribe to this chat group");
        }
    }
}
