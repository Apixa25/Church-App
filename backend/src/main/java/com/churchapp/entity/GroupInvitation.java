package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_invitations",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_group_invitation_unique",
        columnNames = {"group_id", "invited_user_id"}
    ),
    indexes = {
        @Index(name = "idx_group_invitation_group", columnList = "group_id"),
        @Index(name = "idx_group_invitation_inviter", columnList = "inviter_user_id"),
        @Index(name = "idx_group_invitation_invited", columnList = "invited_user_id"),
        @Index(name = "idx_group_invitation_status", columnList = "status")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inviter_user_id", nullable = false)
    private User inviter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_user_id", nullable = false)
    private User invitedUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Size(max = 500, message = "Message cannot exceed 500 characters")
    @Column(name = "message", length = 500)
    private String message;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    public enum InvitationStatus {
        PENDING,
        ACCEPTED,
        DECLINED
    }
}
