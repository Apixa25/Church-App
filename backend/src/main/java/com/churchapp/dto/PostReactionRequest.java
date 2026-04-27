package com.churchapp.dto;

import com.churchapp.entity.PostReactionType;
import lombok.Data;

@Data
public class PostReactionRequest {
    private PostReactionType type;
}
