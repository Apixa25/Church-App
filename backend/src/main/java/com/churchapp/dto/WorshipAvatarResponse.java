package com.churchapp.dto;

import com.churchapp.entity.WorshipAvatar;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Response DTO for animated worship avatars.
 * Contains all information needed by the frontend to render and animate the sprite.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipAvatarResponse {

    private UUID id;
    private String name;
    private String description;
    private String spriteSheetUrl;
    private Integer frameCount;
    private Integer frameWidth;
    private Integer frameHeight;
    private Integer animationDurationMs;

    /**
     * Whether this is the user's currently selected avatar.
     * Only populated when listing avatars for a specific user.
     */
    private Boolean isSelected;

    /**
     * Create response from entity
     */
    public WorshipAvatarResponse(WorshipAvatar avatar) {
        this.id = avatar.getId();
        this.name = avatar.getName();
        this.description = avatar.getDescription();
        this.spriteSheetUrl = avatar.getSpriteSheetUrl();
        this.frameCount = avatar.getFrameCount();
        this.frameWidth = avatar.getFrameWidth();
        this.frameHeight = avatar.getFrameHeight();
        this.animationDurationMs = avatar.getAnimationDurationMs();
        this.isSelected = false;
    }

    /**
     * Create response from entity with selection status
     */
    public WorshipAvatarResponse(WorshipAvatar avatar, UUID selectedAvatarId) {
        this(avatar);
        this.isSelected = avatar.getId().equals(selectedAvatarId);
    }

    /**
     * Static factory method
     */
    public static WorshipAvatarResponse fromEntity(WorshipAvatar avatar) {
        return new WorshipAvatarResponse(avatar);
    }

    /**
     * Static factory method with selection status
     */
    public static WorshipAvatarResponse fromEntity(WorshipAvatar avatar, UUID selectedAvatarId) {
        return new WorshipAvatarResponse(avatar, selectedAvatarId);
    }

    /**
     * Get the total width of the sprite sheet (for CSS animation)
     */
    public Integer getTotalSpriteWidth() {
        return frameCount * frameWidth;
    }
}
