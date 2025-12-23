import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Post } from '../types/Post';
import { getPost } from '../services/postApi';
import { useAuth } from '../contexts/AuthContext';
import PostCard from './PostCard';
import LoadingSpinner from './LoadingSpinner';
import './PostDetailPage.css';

interface LocationState {
  fromComments?: boolean;
}

const PostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we came from the Comments tab
  const locationState = location.state as LocationState;
  const cameFromComments = locationState?.fromComments === true;

  const loadPost = useCallback(async () => {
    if (!postId) {
      setError('Post ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedPost = await getPost(postId);
      setPost(fetchedPost);
    } catch (err: any) {
      console.error('Error loading post:', err);
      if (err?.response?.status === 404) {
        setError('Post not found. It may have been deleted.');
      } else {
        setError(err?.response?.data?.error || 'Failed to load post');
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handlePostUpdate = useCallback((updatedPost: Post) => {
    setPost(updatedPost);
  }, []);

  const handlePostDelete = useCallback((deletedPostId: string) => {
    // Navigate back after post is deleted
    navigate(-1);
  }, [navigate]);

  const handleBackClick = () => {
    // Go back to previous page
    navigate(-1);
  };

  const handleBackToComments = () => {
    // Navigate to own profile with Comments tab active
    if (user?.userId) {
      navigate(`/profile/${user.userId}`, { state: { activeTab: 'comments' } });
    } else {
      navigate('/profile', { state: { activeTab: 'comments' } });
    }
  };

  if (loading) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-header">
          <button onClick={handleBackClick} className="back-button" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back</span>
          </button>
          <h1 className="page-title">Post</h1>
        </div>
        <div className="post-detail-loading">
          <LoadingSpinner type="multi-ring" size="large" text="Loading post..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-header">
          <button onClick={handleBackClick} className="back-button" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back</span>
          </button>
          <h1 className="page-title">Post</h1>
        </div>
        <div className="post-detail-error">
          <div className="error-icon">😕</div>
          <h3>Unable to Load Post</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={loadPost} className="retry-button">
              Try Again
            </button>
            <button onClick={handleBackClick} className="back-link-button">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-header">
          <button onClick={handleBackClick} className="back-button" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back</span>
          </button>
          <h1 className="page-title">Post</h1>
        </div>
        <div className="post-detail-error">
          <div className="error-icon">🔍</div>
          <h3>Post Not Found</h3>
          <p>This post may have been deleted or you may not have access to it.</p>
          <button onClick={handleBackClick} className="back-link-button">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail-page">
      <div className="post-detail-header">
        <button onClick={handleBackClick} className="back-button" aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back</span>
        </button>
        <h1 className="page-title">Post</h1>
        {cameFromComments && (
          <button onClick={handleBackToComments} className="back-to-comments-button" aria-label="Back to comments">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Back to Comments</span>
          </button>
        )}
      </div>
      <div className="post-detail-content">
        <PostCard
          post={post}
          onPostUpdate={handlePostUpdate}
          onPostDelete={handlePostDelete}
          showComments={true}
        />
      </div>
    </div>
  );
};

export default PostDetailPage;
