import api from './api';

export interface ChatGroup {
  id: string;
  name: string;
  type: string;
  description?: string;
  imageUrl?: string;
  createdBy: string;
  createdByName: string;
  createdByProfilePic?: string;
  isPrivate: boolean;
  isActive: boolean;
  maxMembers?: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageTime?: string;
  lastMessage?: string;
  lastMessageBy?: string;
  isMember: boolean;
  canPost: boolean;
  canModerate: boolean;
  userRole?: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  chatGroupId: string;
  chatGroupName: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  userProfilePicUrl?: string;
  content: string;
  messageType: string;
  messageTypeDisplay: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaFilename?: string;
  mediaSize?: number;
  timestamp: string;
  editedAt?: string;
  isEdited: boolean;
  isDeleted: boolean;
  parentMessageId?: string;
  parentMessage?: ChatMessage;
  replyCount: number;
  recentReplies?: ChatMessage[];
  mentionedUserIds?: string[];
  mentions?: UserMention[];
  reactions?: any;
  canEdit: boolean;
  canDelete: boolean;
  tempId?: string;
}

export interface UserMention {
  userId: string;
  userName: string;
  displayName: string;
  profilePicUrl?: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  userName: string;
  displayName: string;
  profilePicUrl?: string;
  email: string;
  memberRole: string;
  roleDisplayName: string;
  isActive: boolean;
  isMuted: boolean;
  notificationsEnabled: boolean;
  lastReadAt?: string;
  joinedAt: string;
  leftAt?: string;
  customName?: string;
  isOnline: boolean;
  canPost: boolean;
  canModerate: boolean;
  canManageMembers: boolean;
  unreadCount?: number;
}

export interface CreateGroupRequest {
  name: string;
  type: string;
  description?: string;
  imageUrl?: string;
  isPrivate?: boolean;
  maxMembers?: number;
}

export interface SendMessageRequest {
  chatGroupId: string;
  content: string;
  messageType?: string;
  parentMessageId?: string;
  mentionedUserIds?: string[];
  tempId?: string;
}

export interface SearchRequest {
  query: string;
  chatGroupIds?: string[];
  userIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  messageType?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface SearchResponse {
  messages: ChatMessage[];
  groups: ChatGroup[];
  users: GroupMember[];
  metadata: {
    query: string;
    totalResults: number;
    limit: number;
    offset: number;
    sortBy: string;
    sortOrder: string;
    searchTimeMs: number;
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
  };
}

const chatApi = {
  // Group management
  getGroups: async (): Promise<ChatGroup[]> => {
    const response = await api.get('/chat/groups');
    return response.data;
  },

  getJoinableGroups: async (): Promise<ChatGroup[]> => {
    const response = await api.get('/chat/groups/joinable');
    return response.data;
  },

  createGroup: async (request: CreateGroupRequest): Promise<ChatGroup> => {
    const response = await api.post('/chat/groups', request);
    return response.data;
  },

  joinGroup: async (groupId: string): Promise<ChatGroup> => {
    const response = await api.post(`/chat/groups/${groupId}/join`);
    return response.data;
  },

  leaveGroup: async (groupId: string): Promise<void> => {
    await api.post(`/chat/groups/${groupId}/leave`);
  },

  createDirectMessage: async (targetUserEmail: string): Promise<ChatGroup> => {
    const response = await api.post('/chat/direct-message', null, {
      params: { targetUserEmail }
    });
    return response.data;
  },

  getUsers: async (): Promise<any[]> => {
    const response = await api.get('/chat/users');
    return response.data;
  },

  // Message management
  getMessages: async (groupId: string, page: number = 0, size: number = 50): Promise<{
    content: ChatMessage[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
  }> => {
    const response = await api.get(`/chat/groups/${groupId}/messages?page=${page}&size=${size}`);
    return response.data;
  },

  sendMessage: async (request: SendMessageRequest): Promise<ChatMessage> => {
    const response = await api.post('/chat/messages', request);
    return response.data;
  },

  sendMediaMessage: async (
    groupId: string,
    file: File,
    content?: string,
    parentMessageId?: string,
    tempId?: string
  ): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('groupId', groupId);
    formData.append('file', file);
    if (content) formData.append('content', content);
    if (parentMessageId) formData.append('parentMessageId', parentMessageId);
    if (tempId) formData.append('tempId', tempId);

    const response = await api.post('/chat/messages/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  editMessage: async (messageId: string, content: string): Promise<ChatMessage> => {
    const response = await api.put(`/chat/messages/${messageId}`, { content });
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await api.delete(`/chat/messages/${messageId}`);
  },

  markAsRead: async (groupId: string, timestamp?: string): Promise<void> => {
    await api.post(`/chat/groups/${groupId}/mark-read`, { timestamp });
  },

  // Member management
  getGroupMembers: async (groupId: string): Promise<GroupMember[]> => {
    const response = await api.get(`/chat/groups/${groupId}/members`);
    return response.data;
  },

  updateMemberRole: async (groupId: string, memberId: string, role: string): Promise<void> => {
    await api.put(`/chat/groups/${groupId}/members/${memberId}/role`, { role });
  },

  // Search
  searchMessages: async (request: SearchRequest): Promise<SearchResponse> => {
    const response = await api.post('/chat/search', request);
    return response.data;
  },

  // Utility
  getChatStatus: async (): Promise<any> => {
    const response = await api.get('/chat/status');
    return response.data;
  },

  getGroupTypes: async (): Promise<Array<{ value: string; label: string }>> => {
    const response = await api.get('/chat/groups/types');
    return response.data;
  },
};

export default chatApi;