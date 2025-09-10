package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatSearchRequest {
    
    @NotBlank(message = "Search query is required")
    @Size(min = 2, max = 200, message = "Search query must be between 2 and 200 characters")
    private String query;
    
    private List<UUID> chatGroupIds; // Specific groups to search in
    
    private List<UUID> userIds; // Messages from specific users
    
    private LocalDateTime dateFrom;
    
    private LocalDateTime dateTo;
    
    private String messageType; // TEXT, IMAGE, VIDEO, etc.
    
    private Boolean includeDeleted = false;
    
    private Integer limit = 50;
    
    private Integer offset = 0;
    
    private String sortBy = "timestamp"; // timestamp, relevance
    
    private String sortOrder = "desc"; // asc, desc
    
    // Validation methods
    public boolean isValidDateRange() {
        if (dateFrom == null || dateTo == null) return true;
        return dateFrom.isBefore(dateTo);
    }
    
    public boolean isValidLimit() {
        return limit != null && limit > 0 && limit <= 100;
    }
    
    public boolean isValidOffset() {
        return offset != null && offset >= 0;
    }
    
    public boolean isValidSortOrder() {
        return sortOrder != null && (sortOrder.equals("asc") || sortOrder.equals("desc"));
    }
}