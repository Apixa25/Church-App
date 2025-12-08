import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { uploadMediaDirect, createPost } from '../services/postApi';
import { CreatePostRequest, PostType } from '../types/Post';

// ============================================================================
// UPLOAD QUEUE CONTEXT - Background uploads like Twitter/Facebook/Instagram
// Allows users to navigate freely while uploads happen in the background
// ============================================================================

export interface UploadJob {
  id: string;
  status: 'pending' | 'uploading' | 'creating-post' | 'completed' | 'failed';
  progress: number; // 0-100
  content: string;
  mediaFiles: File[];
  mediaTypes: string[];
  postType: PostType;
  category?: string;
  location?: string;
  isAnonymous: boolean;
  organizationId?: string;
  groupId?: string;
  externalUrl?: string;  // Social media embed URL
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface UploadQueueContextType {
  // State
  jobs: UploadJob[];
  activeJobCount: number;
  hasActiveUploads: boolean;
  
  // Actions
  addUploadJob: (job: Omit<UploadJob, 'id' | 'status' | 'progress' | 'createdAt'>) => string;
  cancelJob: (jobId: string) => void;
  clearCompletedJobs: () => void;
  retryJob: (jobId: string) => void;
}

const UploadQueueContext = createContext<UploadQueueContextType | undefined>(undefined);

export const useUploadQueue = () => {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error('useUploadQueue must be used within UploadQueueProvider');
  }
  return context;
};

interface UploadQueueProviderProps {
  children: ReactNode;
  onPostCreated?: (post: any) => void;
}

export const UploadQueueProvider: React.FC<UploadQueueProviderProps> = ({ 
  children, 
  onPostCreated 
}) => {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const processingRef = useRef<Set<string>>(new Set());

  // Generate unique ID for each job
  const generateId = () => `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Update a specific job
  const updateJob = useCallback((jobId: string, updates: Partial<UploadJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  }, []);

  // Process a single upload job
  const processJob = useCallback(async (job: UploadJob) => {
    // Prevent double-processing
    if (processingRef.current.has(job.id)) return;
    processingRef.current.add(job.id);

    try {
      // Step 1: Upload media files (if any)
      let mediaUrls: string[] = [];
      
      if (job.mediaFiles.length > 0) {
        updateJob(job.id, { status: 'uploading', progress: 10 });
        
        // Upload each file with progress updates
        const totalFiles = job.mediaFiles.length;
        const uploadedUrls: string[] = [];
        
        for (let i = 0; i < job.mediaFiles.length; i++) {
          const file = job.mediaFiles[i];
          const progressPerFile = 70 / totalFiles; // 70% of progress for uploads
          
          // Upload single file
          const urls = await uploadMediaDirect([file], 'posts');
          uploadedUrls.push(...urls);
          
          // Update progress
          const currentProgress = 10 + ((i + 1) * progressPerFile);
          updateJob(job.id, { progress: Math.round(currentProgress) });
        }
        
        mediaUrls = uploadedUrls;
      } else {
        updateJob(job.id, { progress: 80 });
      }

      // Step 2: Create the post
      updateJob(job.id, { status: 'creating-post', progress: 85 });

      const postRequest: CreatePostRequest = {
        content: job.content.trim(),
        mediaUrls,
        mediaTypes: job.mediaTypes,
        postType: job.postType,
        category: job.category?.trim() || undefined,
        location: job.location?.trim() || undefined,
        anonymous: job.isAnonymous,
        organizationId: job.organizationId,
        groupId: job.groupId,
        externalUrl: job.externalUrl?.trim() || undefined  // Include external URL if provided
      };

      const newPost = await createPost(postRequest);
      
      // Step 3: Mark as completed
      updateJob(job.id, { 
        status: 'completed', 
        progress: 100,
        completedAt: new Date()
      });

      // Notify parent
      if (onPostCreated) {
        onPostCreated(newPost);
      }

      // 🚀 Dispatch feed refresh event so Dashboard can update
      // This ensures the feed shows the new post even when navigating
      console.log('✅ Background upload completed:', job.id, '- dispatching feedRefresh event');
      window.dispatchEvent(new CustomEvent('feedRefresh'));

      // Auto-remove completed job after 5 seconds
      setTimeout(() => {
        setJobs(prev => prev.filter(j => j.id !== job.id));
      }, 5000);

    } catch (error: any) {
      console.error('❌ Background upload failed:', job.id, error);
      updateJob(job.id, { 
        status: 'failed', 
        error: error.response?.data?.message || error.message || 'Upload failed'
      });
    } finally {
      processingRef.current.delete(job.id);
    }
  }, [updateJob, onPostCreated]);

  // Add a new upload job
  const addUploadJob = useCallback((
    jobData: Omit<UploadJob, 'id' | 'status' | 'progress' | 'createdAt'>
  ): string => {
    const newJob: UploadJob = {
      ...jobData,
      id: generateId(),
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    setJobs(prev => [...prev, newJob]);

    // Start processing immediately
    setTimeout(() => processJob(newJob), 100);

    console.log('📤 Upload job queued:', newJob.id);
    return newJob.id;
  }, [processJob]);

  // Cancel a job
  const cancelJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
    processingRef.current.delete(jobId);
  }, []);

  // Clear all completed jobs
  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'completed'));
  }, []);

  // Retry a failed job
  const retryJob = useCallback((jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job && job.status === 'failed') {
      updateJob(jobId, { status: 'pending', progress: 0, error: undefined });
      setTimeout(() => processJob(job), 100);
    }
  }, [jobs, updateJob, processJob]);

  // Computed values
  const activeJobCount = jobs.filter(j => 
    j.status === 'pending' || j.status === 'uploading' || j.status === 'creating-post'
  ).length;
  
  const hasActiveUploads = activeJobCount > 0;

  const value: UploadQueueContextType = {
    jobs,
    activeJobCount,
    hasActiveUploads,
    addUploadJob,
    cancelJob,
    clearCompletedJobs,
    retryJob
  };

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
};

export default UploadQueueContext;

