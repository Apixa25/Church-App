package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {

    @NotBlank(message = "Comment content cannot be blank")
    @Size(max = 1000, message = "Comment content cannot exceed 1000 characters")
    private String content;

    private List<String> mediaUrls;

    private List<String> mediaTypes;

    private UUID parentCommentId; // For nested replies

    private boolean anonymous = false;

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }
}
