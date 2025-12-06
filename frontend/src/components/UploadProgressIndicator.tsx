import React from 'react';
import { useUploadQueue } from '../contexts/UploadQueueContext';
import './UploadProgressIndicator.css';

// ============================================================================
// UPLOAD PROGRESS INDICATOR - Shows global upload status (Twitter-style)
// Displays at top of screen so users can see progress while navigating
// ============================================================================

const UploadProgressIndicator: React.FC = () => {
  const { jobs, cancelJob, retryJob } = useUploadQueue();

  // Don't render if no jobs
  if (jobs.length === 0) return null;

  // Categorize jobs by status
  const activeJobs = jobs.filter(j => 
    j.status === 'pending' || j.status === 'uploading' || j.status === 'creating-post'
  );
  const failedJobs = jobs.filter(j => j.status === 'failed');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'creating-post': return '✍️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '📤';
    }
  };

  const getStatusText = (status: string, progress: number) => {
    switch (status) {
      case 'pending': return 'Preparing upload...';
      case 'uploading': return `Uploading media... ${progress}%`;
      case 'creating-post': return 'Creating post...';
      case 'completed': return 'Posted successfully!';
      case 'failed': return 'Upload failed';
      default: return 'Processing...';
    }
  };

  return (
    <div className="upload-progress-container">
      {/* Active uploads */}
      {activeJobs.map(job => (
        <div key={job.id} className="upload-progress-item active">
          <div className="upload-progress-bar">
            <div 
              className="upload-progress-fill" 
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <div className="upload-progress-content">
            <span className="upload-status-icon">{getStatusIcon(job.status)}</span>
            <span className="upload-status-text">
              {getStatusText(job.status, job.progress)}
            </span>
            <button 
              className="upload-cancel-btn"
              onClick={() => cancelJob(job.id)}
              title="Cancel upload"
            >
              ✕
            </button>
          </div>
          {job.content && (
            <div className="upload-preview">
              "{job.content.substring(0, 50)}{job.content.length > 50 ? '...' : ''}"
            </div>
          )}
        </div>
      ))}

      {/* Failed uploads */}
      {failedJobs.map(job => (
        <div key={job.id} className="upload-progress-item failed">
          <div className="upload-progress-content">
            <span className="upload-status-icon">❌</span>
            <span className="upload-status-text">
              Upload failed: {job.error || 'Unknown error'}
            </span>
            <div className="upload-actions">
              <button 
                className="upload-retry-btn"
                onClick={() => retryJob(job.id)}
                title="Retry upload"
              >
                🔄 Retry
              </button>
              <button 
                className="upload-cancel-btn"
                onClick={() => cancelJob(job.id)}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Completed uploads (auto-dismissing) */}
      {completedJobs.map(job => (
        <div key={job.id} className="upload-progress-item completed">
          <div className="upload-progress-content">
            <span className="upload-status-icon">✅</span>
            <span className="upload-status-text">Posted successfully!</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UploadProgressIndicator;

