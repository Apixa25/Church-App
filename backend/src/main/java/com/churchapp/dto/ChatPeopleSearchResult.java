package com.churchapp.dto;

import com.churchapp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatPeopleSearchResult {
    private UUID userId;
    private String name;
    private String profilePicUrl;
    private String bio;
    private String location;

    public static ChatPeopleSearchResult fromUser(User user) {
        return new ChatPeopleSearchResult(
            user.getId(),
            user.getName(),
            user.getProfilePicUrl(),
            user.getBio(),
            user.getLocation()
        );
    }
}
