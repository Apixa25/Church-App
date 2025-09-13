package com.churchapp.dto;

import com.churchapp.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePostRequest {

    @NotBlank(message = "Post content cannot be blank")
    @Size(max = 2000, message = "Post content cannot exceed 2000 characters")
    private String content;

    private List<String> mediaUrls;

    private List<String> mediaTypes;

    private Post.PostType postType = Post.PostType.GENERAL;

    private String category;

    private String location;

    private boolean anonymous = false;

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }
}
