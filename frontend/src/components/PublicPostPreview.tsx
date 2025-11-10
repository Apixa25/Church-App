import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicPost } from '../services/postApi';
import './PublicPostPreview.css';

interface PublicPost {
  id: string;
  title: string;
  contentPreview: string;
  postType: string;
  authorName: string;
  authorAvatarUrl?: string;
  heroImageUrl?: string;
  createdAt?: string;
}

const PublicPostPreview: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<PublicPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!postId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await getPublicPost(postId);
        setPost(response);
      } catch (err: any) {
        console.error('Failed to load public post', err);
        setError(err?.response?.data?.message || 'This shared post is not available.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [postId]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="public-post-card loading">
          <div className="spinner" />
          <p>Loading shared post…</p>
        </div>
      );
    }

    if (error || !post) {
      return (
        <div className="public-post-card error">
          <h1>Post unavailable</h1>
          <p>{error || 'This link may have expired or the content is private.'}</p>
        </div>
      );
    }

    const hero = post.heroImageUrl || '/dashboard-banner.jpg';

    return (
      <div className="public-post-card">
        {hero && (
          <img
            className="public-post-hero"
            src={hero}
            alt={post.title}
          />
        )}
        <div className="public-post-content">
          <span className="public-post-type">{post.postType.toLowerCase()}</span>
          <h1>{post.title}</h1>
          <p>{post.contentPreview}</p>
          <div className="public-post-meta">
            {post.authorAvatarUrl ? (
              <img
                className="public-post-avatar"
                src={post.authorAvatarUrl}
                alt={post.authorName}
              />
            ) : (
              <div className="public-post-avatar placeholder">
                {post.authorName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="public-post-author">
              <span>{post.authorName}</span>
              {post.createdAt && (
                <time dateTime={post.createdAt}>
                  {new Date(post.createdAt).toLocaleString()}
                </time>
              )}
            </div>
          </div>
          <a className="public-post-cta" href="/dashboard" target="_blank" rel="noopener">
            Open in Church App
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="public-post-preview">
      {renderContent()}
    </div>
  );
};

export default PublicPostPreview;

