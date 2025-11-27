package com.churchapp.repository;

import com.churchapp.entity.UserLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserLikeRepository extends JpaRepository<UserLike, UserLike.UserLikeId> {

    // Check if user liked another user
    boolean existsById_UserIdAndId_LikedUserId(UUID userId, UUID likedUserId);

    // Find like by user and liked user
    Optional<UserLike> findById_UserIdAndId_LikedUserId(UUID userId, UUID likedUserId);

    // Count hearts received by a user
    long countById_LikedUserId(UUID likedUserId);

    // Count hearts given by a user
    long countById_UserId(UUID userId);

    // Delete like by user and liked user
    @Modifying
    @Query("DELETE FROM UserLike ul WHERE ul.id.userId = :userId AND ul.id.likedUserId = :likedUserId")
    void deleteByUserIdAndLikedUserId(@Param("userId") UUID userId, @Param("likedUserId") UUID likedUserId);

    // Delete all likes for a user (when user is deleted)
    @Modifying
    @Query("DELETE FROM UserLike ul WHERE ul.id.likedUserId = :userId OR ul.id.userId = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}

