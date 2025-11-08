package com.churchapp.service;

import com.churchapp.entity.User;
import com.churchapp.entity.WorshipRoom;
import com.churchapp.entity.WorshipRoomParticipant;
import com.churchapp.repository.WorshipRoomParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorshipPermissionService {

    private final WorshipRoomParticipantRepository participantRepository;

    /**
     * Check if user can create worship rooms
     */
    public boolean canCreateRoom(User user) {
        // All authenticated users can create rooms
        // Could add role checks here (e.g., only ADMIN or MODERATOR)
        return user != null && user.getIsActive();
    }

    /**
     * Check if user can join a room
     */
    public boolean canJoinRoom(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Administrators can always join rooms for moderation or cleanup
        if (user.getRole() == User.Role.ADMIN) {
            return true;
        }

        if (!room.getIsActive()) {
            return false;
        }

        // Check if room is private
        if (room.getIsPrivate() && !room.isCreator(user)) {
            return false;
        }

        // Check if room is full
        if (room.getMaxParticipants() != null &&
            room.getActiveParticipantCount() >= room.getMaxParticipants()) {
            return false;
        }

        // Check if already a participant
        return !room.isParticipant(user);
    }

    /**
     * Check if user can control playback (play/pause/skip)
     */
    public boolean canControlPlayback(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Room creator always has control
        if (room.isCreator(user)) {
            return true;
        }

        // Current leader has control
        if (room.isCurrentLeader(user)) {
            return true;
        }

        // Check participant role
        Optional<WorshipRoomParticipant> participantOpt =
            participantRepository.findByWorshipRoomAndUser(room, user);

        return participantOpt.map(WorshipRoomParticipant::canControlPlayback).orElse(false);
    }

    /**
     * Check if user can add songs to queue
     */
    public boolean canAddToQueue(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Must be a participant
        if (!room.isParticipant(user)) {
            return false;
        }

        // Admins can always add songs once they have joined the room
        if (user.getRole() == User.Role.ADMIN) {
            return true;
        }

        // Room creator can always add
        if (room.isCreator(user)) {
            return true;
        }

        // Check participant role
        Optional<WorshipRoomParticipant> participantOpt =
            participantRepository.findByWorshipRoomAndUser(room, user);

        return participantOpt.map(WorshipRoomParticipant::canAddToQueue).orElse(false);
    }

    /**
     * Check if user can vote on songs
     */
    public boolean canVote(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Must be an active participant - use repository to avoid lazy loading issues
        Optional<WorshipRoomParticipant> participantOpt =
            participantRepository.findByWorshipRoomAndUser(room, user);

        return participantOpt.isPresent() && participantOpt.get().getIsActive();
    }

    /**
     * Check if user can moderate room (kick users, skip songs, etc.)
     */
    public boolean canModerateRoom(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Room creator can moderate
        if (room.isCreator(user)) {
            return true;
        }

        // Check if user is a moderator
        Optional<WorshipRoomParticipant> participantOpt =
            participantRepository.findByWorshipRoomAndUser(room, user);

        return participantOpt.map(WorshipRoomParticipant::canModerateRoom).orElse(false);
    }

    /**
     * Check if user can edit room settings
     */
    public boolean canEditRoom(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Only room creator can edit room settings
        return room.isCreator(user);
    }

    /**
     * Check if user can delete room
     */
    public boolean canDeleteRoom(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Only room creator or admin can delete room
        return room.isCreator(user) || user.getRole() == User.Role.ADMIN;
    }

    /**
     * Check if user can join waitlist
     */
    public boolean canJoinWaitlist(User user, WorshipRoom room) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Must be a participant
        if (!room.isParticipant(user)) {
            return false;
        }

        // Check if already in waitlist
        return !participantRepository.isUserInWaitlist(room, user);
    }

    /**
     * Check if user can remove someone from waitlist
     */
    public boolean canRemoveFromWaitlist(User user, WorshipRoom room, User targetUser) {
        if (user == null || !user.getIsActive()) {
            return false;
        }

        // Can remove yourself
        if (user.equals(targetUser)) {
            return true;
        }

        // Moderators can remove others
        return canModerateRoom(user, room);
    }

    /**
     * Get participant role for user in room
     */
    public WorshipRoomParticipant.ParticipantRole getParticipantRole(User user, WorshipRoom room) {
        if (user == null || room == null) {
            return WorshipRoomParticipant.ParticipantRole.LISTENER;
        }

        Optional<WorshipRoomParticipant> participantOpt =
            participantRepository.findByWorshipRoomAndUser(room, user);

        return participantOpt
            .map(WorshipRoomParticipant::getRole)
            .orElse(WorshipRoomParticipant.ParticipantRole.LISTENER);
    }

    /**
     * Check if user is creator
     */
    public boolean isCreator(User user, WorshipRoom room) {
        return user != null && room != null && room.isCreator(user);
    }

    /**
     * Check if user is current leader
     */
    public boolean isCurrentLeader(User user, WorshipRoom room) {
        return user != null && room != null && room.isCurrentLeader(user);
    }

    /**
     * Check if user is participant
     */
    public boolean isParticipant(User user, WorshipRoom room) {
        return user != null && room != null && room.isParticipant(user);
    }
}
