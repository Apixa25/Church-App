package com.churchapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipVoteRequest {

    @NotNull(message = "Queue entry ID is required")
    private UUID queueEntryId;

    @NotNull(message = "Vote type is required")
    private VoteType voteType;

    public enum VoteType {
        UPVOTE,
        SKIP
    }
}
