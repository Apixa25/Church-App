package com.churchapp.dto;

import com.churchapp.entity.PostShare;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SharePostRequest {

    private PostShare.ShareType shareType = PostShare.ShareType.REPOST;

    @Size(max = 500, message = "Quote text cannot exceed 500 characters")
    private String content; // Optional quote text for QUOTE shares
}
