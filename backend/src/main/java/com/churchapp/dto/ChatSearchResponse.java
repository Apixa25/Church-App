package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatSearchResponse {
    
    private List<MessageResponse> messages;
    private List<ChatGroupResponse> groups;
    private List<ChatGroupMemberResponse> users;
    private SearchMetadata metadata;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchMetadata {
        private String query;
        private Long totalResults;
        private Integer limit;
        private Integer offset;
        private String sortBy;
        private String sortOrder;
        private Long searchTimeMs;
        private Boolean hasMore;
        private Integer currentPage;
        private Integer totalPages;
        
        public static SearchMetadata create(String query, Long totalResults, 
                Integer limit, Integer offset, String sortBy, String sortOrder, Long searchTimeMs) {
            SearchMetadata metadata = new SearchMetadata();
            metadata.setQuery(query);
            metadata.setTotalResults(totalResults);
            metadata.setLimit(limit);
            metadata.setOffset(offset);
            metadata.setSortBy(sortBy);
            metadata.setSortOrder(sortOrder);
            metadata.setSearchTimeMs(searchTimeMs);
            metadata.setHasMore(totalResults > offset + limit);
            metadata.setCurrentPage((offset / limit) + 1);
            metadata.setTotalPages((int) Math.ceil((double) totalResults / limit));
            return metadata;
        }
    }
    
    // Static factory methods
    public static ChatSearchResponse createMessageResults(List<MessageResponse> messages, SearchMetadata metadata) {
        return new ChatSearchResponse(messages, null, null, metadata);
    }
    
    public static ChatSearchResponse createGroupResults(List<ChatGroupResponse> groups, SearchMetadata metadata) {
        return new ChatSearchResponse(null, groups, null, metadata);
    }
    
    public static ChatSearchResponse createUserResults(List<ChatGroupMemberResponse> users, SearchMetadata metadata) {
        return new ChatSearchResponse(null, null, users, metadata);
    }
    
    public static ChatSearchResponse createMixedResults(List<MessageResponse> messages, 
            List<ChatGroupResponse> groups, List<ChatGroupMemberResponse> users, SearchMetadata metadata) {
        return new ChatSearchResponse(messages, groups, users, metadata);
    }
    
    // Helper methods
    public boolean hasMessages() {
        return messages != null && !messages.isEmpty();
    }
    
    public boolean hasGroups() {
        return groups != null && !groups.isEmpty();
    }
    
    public boolean hasUsers() {
        return users != null && !users.isEmpty();
    }
    
    public boolean hasResults() {
        return hasMessages() || hasGroups() || hasUsers();
    }
    
    public int getMessageCount() {
        return messages != null ? messages.size() : 0;
    }
    
    public int getGroupCount() {
        return groups != null ? groups.size() : 0;
    }
    
    public int getUserCount() {
        return users != null ? users.size() : 0;
    }
    
    public int getTotalResultCount() {
        return getMessageCount() + getGroupCount() + getUserCount();
    }
}