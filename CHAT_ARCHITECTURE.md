# 💬 Chat Architecture & Scaling Notes

This document captures how The Gathering's messaging works after the **Chat Quality Hardening** pass,
the deliberate trade-offs, and the exact path to scale it past a single backend instance.

---

## 1. Transport overview

| Path | Used for | Notes |
|------|----------|-------|
| `REST /chat/**` | Loading history, groups, members, search, media presign/confirm, reactions, mute, mark-read | Always available; the client falls back to `POST /chat/messages` when the socket is down |
| `STOMP over SockJS /ws` | Live delivery, typing, read receipts, presence | JWT validated on `CONNECT`; group topics are membership-gated on `SUBSCRIBE` |

**Every broadcast happens once, inside `ChatService`.** Controllers never publish directly (no `@SendTo`),
so REST and WebSocket sends behave identically and clients never receive duplicates.

### Topics

| Destination | Payload | Who may subscribe |
|-------------|---------|-------------------|
| `/topic/group/{groupId}/messages` | `MessageResponse` (new, edited, deleted, reaction changes, system messages) | Active members only |
| `/topic/group/{groupId}` | `GroupNotification` (`user_joined`, `user_left`, `member_updated`, ...) | Active members only |
| `/topic/group/{groupId}/typing` | `{ userId, displayName, isTyping }` | Active members only |
| `/topic/group/{groupId}/read` | `{ userId, displayName, timestamp }` | Active members only |
| `/topic/presence` | `{ userEmail, status }` from `ChatPresenceService` | Any authenticated user |
| `/user/queue/events` | `ChatNotificationEvent` for the bell / unread badge | Owner only |
| `/user/queue/errors` | `{ code, message, tempId, groupId }` | Owner only |

Emails are **never** broadcast to group topics; typing/read events carry `userId` + `displayName`.

### JSON

`WebSocketConfig.configureMessageConverters` registers the application's `@Primary ObjectMapper`
(`JacksonConfig`), so STOMP payloads serialize exactly like REST: `LocalDateTime` as ISO-8601 strings
(UTC, no offset), `null`s included. The frontend parses both with `frontend/src/utils/serverTime.ts`.

---

## 2. Multi-tenant scoping

* `chat_groups.organization_id` (Flyway `V55`) ties every non-DM group to an organization, resolved
  in the standard order from `project-vision.md`: requested org → church primary → family primary →
  Global Organization (`00000000-0000-0000-0000-000000000001`).
* `GET /chat/groups/joinable` and `POST /chat/groups/{id}/join` are restricted to the user's organizations
  (`PLATFORM_ADMIN` sees everything). `MAIN` group names are unique **per organization**.
* **Direct messages are intentionally cross-organization.** "Find People" and profile "Message" buttons
  depend on that. DMs are gated by account status and the block list (`UserBlockService`) instead.

---

## 3. Single-instance broker (current) ⚠️

`WebSocketConfig.configureMessageBroker` uses Spring's **simple in-memory broker**:

```java
// backend/src/main/java/com/churchapp/config/WebSocketConfig.java
config.enableSimpleBroker("/topic", "/queue");
```

This is correct for the current Elastic Beanstalk deployment of **one** application instance. It breaks the
moment there are two or more:

* A user connected to instance A never receives messages published on instance B.
* `ChatPresenceService` only knows about sessions on its own instance.
* `/user/queue/**` destinations are resolved per instance.

**Do not enable EB auto-scaling / add instances for the API before completing section 4.**

---

## 4. Scaling path: external STOMP broker relay

The industry-standard fix is to swap the simple broker for a **STOMP broker relay** backed by RabbitMQ.
On AWS the managed option is **Amazon MQ for RabbitMQ**. Spring supports this natively, so the client
code and every `@MessageMapping` stay the same.

### 4.1 Dependencies

```xml
<!-- backend/pom.xml -->
<dependency>
    <groupId>io.projectreactor.netty</groupId>
    <artifactId>reactor-netty</artifactId>
</dependency>
```

### 4.2 Configuration change

```java
// backend/src/main/java/com/churchapp/config/WebSocketConfig.java
@Override
public void configureMessageBroker(MessageBrokerRegistry config) {
    config.enableStompBrokerRelay("/topic", "/queue")
          .setRelayHost(relayHost)              // Amazon MQ endpoint
          .setRelayPort(61614)                  // STOMP over TLS on Amazon MQ
          .setClientLogin(relayUser)
          .setClientPasscode(relayPassword)
          .setSystemLogin(relayUser)
          .setSystemPasscode(relayPassword)
          .setUserDestinationBroadcast("/topic/unresolved-user-destination")
          .setUserRegistryBroadcast("/topic/registry-broadcast")
          .setTcpClient(tlsTcpClient());        // ReactorNettyTcpClient with SSL for Amazon MQ
    config.setApplicationDestinationPrefixes("/app");
    config.setUserDestinationPrefix("/user");
}
```

* `setUserDestinationBroadcast` and `setUserRegistryBroadcast` are what make `/user/queue/**`
  work across instances — do not skip them.
* Enable the `rabbitmq_stomp` plugin on the broker (Amazon MQ exposes it as a configuration option).
* Keep the values in environment variables (`CHAT_BROKER_HOST`, `CHAT_BROKER_USER`, `CHAT_BROKER_PASSWORD`)
  alongside the other EB env vars documented in `ENVIRONMENT_VARIABLES.md`.

### 4.3 Presence

`ChatPresenceService` keeps `email -> sessionIds` in memory. When moving to multiple instances, either:

1. store presence in **Redis** (`SET chat:online:{email}` with a TTL refreshed by STOMP heartbeats), or
2. subscribe every instance to `/topic/presence` and merge, accepting eventual consistency.

Option 1 is the conventional choice and also lets the REST `isOnline` fields stay accurate.

### 4.4 Sticky sessions

SockJS fallbacks (XHR streaming/polling) require **sticky sessions** on the load balancer. On the EB
Application Load Balancer enable stickiness on the target group (duration ≥ the SockJS session timeout).
Native WebSocket connections do not need it, but the fallback path does.

### 4.5 Rollout checklist

- [ ] Provision Amazon MQ (RabbitMQ engine) in the same VPC as the EB environment; open port 61614 from the EB security group.
- [ ] Add `reactor-netty`, switch to `enableStompBrokerRelay`, wire TLS `ReactorNettyTcpClient`.
- [ ] Move presence to Redis (ElastiCache) or accept per-instance presence.
- [ ] Enable ALB stickiness.
- [ ] Deploy with **one** instance first and verify: send/receive, typing, read receipts, `/user/queue/events` bell.
- [ ] Scale to two instances; open two browsers pinned to different instances and confirm cross-instance delivery.

---

## 5. Retention

`ChatCleanupService` hard-deletes messages and their S3 media after `chat.cleanup.retention-days`.
It is **disabled by default** (`CHAT_CLEANUP_ENABLED=false`); consumer messengers keep history and silently
erasing a group's conversation surprises users. If an environment needs retention (storage cost, policy),
set `CHAT_CLEANUP_ENABLED=true` and a deliberate `CHAT_CLEANUP_RETENTION_DAYS`. The job detaches surviving
replies from parents before deleting so the `parent_message_id` foreign key cannot fail the run.

---

## 6. Client behaviour summary

* **Optimistic send** — `ChatRoom` appends a `status: 'sending'` message with a `tempId`, publishes over
  STOMP, and reconciles when the server echo (same `tempId`) arrives. A 10 s ack timeout or a
  `/user/queue/errors` payload with that `tempId` flips it to `failed` with Retry / Discard.
* **REST fallback** — if the socket is down, `POST /chat/messages` is used and the response is merged directly.
* **Smart scroll** — auto-scroll only when the user is near the bottom (or sent the message); otherwise a
  "↓ N new messages" pill appears. Prepending history preserves the scroll offset.
* **Unread** — incoming messages debounce a `mark-read` call while the room is visible, and the nav badge
  uses `GET /chat/unread-count` (one aggregate query) refreshed by `/user/queue/events`.
