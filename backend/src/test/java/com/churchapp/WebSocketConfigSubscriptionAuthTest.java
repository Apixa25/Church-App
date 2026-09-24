package com.churchapp;

import com.churchapp.config.WebSocketConfig;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.User;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The inbound channel interceptor is the only thing standing between an authenticated user and
 * every other group's message stream, so its SUBSCRIBE rules get their own tests.
 */
@ExtendWith(MockitoExtension.class)
class WebSocketConfigSubscriptionAuthTest {

    @Mock private JwtUtil jwtUtil;
    @Mock private UserDetailsService userDetailsService;
    @Mock private UserRepository userRepository;
    @Mock private ChatGroupRepository chatGroupRepository;
    @Mock private ChatGroupMemberRepository chatGroupMemberRepository;

    private ChannelInterceptor interceptor;
    private User alice;
    private ChatGroup group;

    @BeforeEach
    void setUp() {
        WebSocketConfig config = new WebSocketConfig(
            jwtUtil, userDetailsService, userRepository, chatGroupRepository, chatGroupMemberRepository, new ObjectMapper());

        ChannelRegistration registration = new ChannelRegistration();
        config.configureClientInboundChannel(registration);
        interceptor = extractInterceptor(registration);

        alice = new User();
        alice.setId(UUID.randomUUID());
        alice.setEmail("alice@example.com");
        alice.setName("Alice");

        group = new ChatGroup();
        group.setId(UUID.randomUUID());
        group.setName("Grace Men");
        group.setType(ChatGroup.GroupType.MENS);

        lenient().when(userRepository.findByEmail(alice.getEmail())).thenReturn(Optional.of(alice));
        lenient().when(chatGroupRepository.findById(group.getId())).thenReturn(Optional.of(group));
    }

    @Test
    void subscribe_toGroupTopic_isAllowedForActiveMembers() {
        when(chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(alice, group)).thenReturn(true);

        Message<?> message = subscribe("/topic/group/" + group.getId() + "/messages", alice.getEmail());

        assertSame(message, interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribe_toGroupTopic_isRejectedForNonMembers() {
        when(chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(alice, group)).thenReturn(false);

        Message<?> message = subscribe("/topic/group/" + group.getId() + "/messages", alice.getEmail());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribe_toGroupSubTopics_isCoveredByTheSameRule() {
        when(chatGroupMemberRepository.existsByUserAndChatGroupAndIsActiveTrue(alice, group)).thenReturn(false);

        for (String suffix : List.of("", "/typing", "/read", "/anything/nested")) {
            Message<?> message = subscribe("/topic/group/" + group.getId() + suffix, alice.getEmail());
            assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(message, mock(MessageChannel.class)), "destination suffix: " + suffix);
        }
    }

    @Test
    void subscribe_toGroupTopic_isRejectedWhenGroupDoesNotExist() {
        UUID missing = UUID.randomUUID();
        when(chatGroupRepository.findById(missing)).thenReturn(Optional.empty());

        Message<?> message = subscribe("/topic/group/" + missing + "/messages", alice.getEmail());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, mock(MessageChannel.class)));
        verify(chatGroupMemberRepository, never()).existsByUserAndChatGroupAndIsActiveTrue(any(), any());
    }

    @Test
    void subscribe_toGroupTopic_isRejectedWithoutAuthenticatedPrincipal() {
        Message<?> message = subscribe("/topic/group/" + group.getId() + "/messages", null);

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    @Test
    void subscribe_toNonGroupTopics_isNotGatedByMembership() {
        for (String destination : List.of("/topic/presence", "/topic/events", "/user/queue/errors", "/user/queue/events")) {
            Message<?> message = subscribe(destination, alice.getEmail());
            assertNotNull(interceptor.preSend(message, mock(MessageChannel.class)), destination);
        }
        verify(chatGroupMemberRepository, never()).existsByUserAndChatGroupAndIsActiveTrue(any(), any());
    }

    @Test
    void connect_withoutValidToken_isRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, mock(MessageChannel.class)));
    }

    // ==================== helpers ====================

    private static Message<byte[]> subscribe(String destination, String principalEmail) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        accessor.setSubscriptionId("sub-0");
        if (principalEmail != null) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(principalEmail, null, new ArrayList<>()));
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static ChannelInterceptor extractInterceptor(ChannelRegistration registration) {
        try {
            var method = ChannelRegistration.class.getDeclaredMethod("getInterceptors");
            method.setAccessible(true);
            @SuppressWarnings("unchecked")
            List<ChannelInterceptor> interceptors = (List<ChannelInterceptor>) method.invoke(registration);
            return interceptors.get(0);
        } catch (Exception e) {
            throw new IllegalStateException("Could not read interceptors from ChannelRegistration", e);
        }
    }
}
