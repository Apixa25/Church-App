export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  bio?: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  profilePicUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  bio?: string;
  role?: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  profilePicUrl?: string;
}

export interface ProfileCompletionStatus {
  isComplete: boolean;
  userId: string;
  profileCompletionPercentage: number;
}

export interface FileUploadResponse {
  fileUrl?: string;
  message: string;
  success: boolean;
}