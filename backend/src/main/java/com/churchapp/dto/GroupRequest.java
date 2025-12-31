package com.churchapp.dto;

import com.churchapp.entity.Group;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupRequest {

    @NotBlank(message = "Group name is required")
    @Size(min = 2, max = 255, message = "Group name must be between 2 and 255 characters")
    private String name;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @NotBlank(message = "Group type is required")
    private String type; // PUBLIC, ORG_PRIVATE, CROSS_ORG, INVITE_ONLY

    private List<String> tags;

    private Map<String, Object> settings;

    // For CROSS_ORG groups
    private List<UUID> allowedOrgIds;

    // Group image URL (uploaded via presigned URL)
    @Size(max = 500, message = "Image URL cannot exceed 500 characters")
    private String imageUrl;

    public Group toGroup() {
        Group group = new Group();
        group.setName(this.name);
        group.setDescription(this.description);

        // Parse enum
        if (this.type != null) {
            group.setType(Group.GroupType.valueOf(this.type.toUpperCase()));
        }

        group.setTags(this.tags);
        group.setSettings(this.settings);
        group.setAllowedOrgIds(this.allowedOrgIds);
        group.setImageUrl(this.imageUrl);

        // Creator and timestamps set by service layer

        return group;
    }
}
