package com.churchapp.dto;

import com.churchapp.entity.ChatGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupRequest {
    
    @NotBlank(message = "Group name is required")
    @Size(min = 2, max = 100, message = "Group name must be between 2 and 100 characters")
    private String name;
    
    @NotNull(message = "Group type is required")
    private ChatGroup.GroupType type;
    
    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;
    
    private String imageUrl;
    
    private Boolean isPrivate = false;
    
    private Integer maxMembers;
    
    // Validation methods
    public boolean isValidGroupType() {
        return type != null;
    }
    
    public boolean isValidMaxMembers() {
        return maxMembers == null || maxMembers > 0;
    }
}