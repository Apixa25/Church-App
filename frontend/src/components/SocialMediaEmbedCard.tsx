import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SocialMediaPlatform, getPlatformDisplayName } from '../utils/socialMediaUtils';
import './SocialMediaEmbedCard.css';

interface YouTubeEmbedData {
  videoId: string;
  title: string;
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
}

interface SocialMediaEmbedCardProps {
  embedHtml: string;
  externalUrl: string;
  platform: string;
  onRemove?: () => void;
}

/**
 * Social Media Embed Card Component
 * Industry Standard: Following X.com's approach to displaying embedded content
 *
 * Supports:
 * - X (Twitter): Uses dangerouslySetInnerHTML with Twitter widget script
 * - YouTube: Parses JSON metadata and renders custom iframe embed with rich preview
 */
const SocialMediaEmbedCard: React.FC<SocialMediaEmbedCardProps> = ({
  embedHtml,
  externalUrl,
  platform,
  onRemove
}) => {
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const [showYouTubePlayer, setShowYouTubePlayer] = useState(false);

  // Parse YouTube embed data from JSON stored in embedHtml
  const youtubeData = useMemo((): YouTubeEmbedData | null => {
    if (platform !== 'YOUTUBE' || !embedHtml) return null;

    try {
      return JSON.parse(embedHtml) as YouTubeEmbedData;
    } catch (e) {
      console.warn('Failed to parse YouTube embed data:', e);
      return null;
    }
  }, [embedHtml, platform]);

  // Extract video ID from URL for fallback
  const videoIdFromUrl = useMemo((): string | null => {
    if (platform !== 'YOUTUBE' || !externalUrl) return null;

    // YouTube URL patterns
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = externalUrl.match(pattern);
      if (match) return match[1];
    }
    return null;
  }, [externalUrl, platform]);

  useEffect(() => {
    // Only handle X/Twitter embeds here - YouTube is handled separately
    if (platform === 'YOUTUBE') return;

    if (embedContainerRef.current && embedHtml) {
      // Clear previous content
      embedContainerRef.current.innerHTML = '';

      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = embedHtml;

      // Move all nodes to our container
      while (tempDiv.firstChild) {
        embedContainerRef.current.appendChild(tempDiv.firstChild);
      }

      // Load Twitter widget script if needed (for X/Twitter embeds)
      if (platform === 'X_POST' || platform === 'X') {
        loadTwitterWidget();
      }
    }
  }, [embedHtml, platform]);

  const loadTwitterWidget = () => {
    // Check if Twitter widget script is already loaded
    if ((window as any).twttr) {
      // Widget already loaded, just render
      (window as any).twttr.widgets.load();
      return;
    }

    // Load Twitter widget script
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.onload = () => {
      // Widget loaded, now render
      if ((window as any).twttr && (window as any).twttr.widgets) {
        (window as any).twttr.widgets.load();
      }
    };
    document.body.appendChild(script);
  };

  const handleOpenLink = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePlayYouTube = () => {
    setShowYouTubePlayer(true);
  };

  const platformDisplayName = getPlatformDisplayName(platform as SocialMediaPlatform);

  // Determine badge class based on platform
  const getBadgeClass = (): string => {
    switch (platform) {
      case 'YOUTUBE':
        return 'embed-platform-badge youtube-badge';
      case 'FACEBOOK_REEL':
      case 'FACEBOOK_POST':
        return 'embed-platform-badge facebook-badge';
      case 'INSTAGRAM_REEL':
        return 'embed-platform-badge instagram-badge';
      default:
        return 'embed-platform-badge';
    }
  };

  if (!embedHtml && !externalUrl) {
    return null;
  }

  // Render YouTube embed with rich preview
  if (platform === 'YOUTUBE') {
    const videoId = youtubeData?.videoId || videoIdFromUrl;
    const title = youtubeData?.title || 'YouTube Video';
    const authorName = youtubeData?.authorName || '';
    const thumbnailUrl = youtubeData?.thumbnailUrl ||
      (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '');

    if (!videoId) {
      // Fallback if we can't extract video ID
      return (
        <div className="social-media-embed-card">
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="embed-remove-button"
              aria-label="Remove embed"
              title="Remove embed"
            >
              X
            </button>
          )}
          <div className="embed-header">
            <span className={getBadgeClass()}>YouTube</span>
            {externalUrl && (
              <button
                type="button"
                onClick={handleOpenLink}
                className="embed-open-link-button"
                title="Open on YouTube"
              >
                Open on YouTube
              </button>
            )}
          </div>
          <div className="embed-fallback">
            <p>YouTube video</p>
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-fallback-link"
              >
                View on YouTube
              </a>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="social-media-embed-card youtube-embed">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="embed-remove-button"
            aria-label="Remove embed"
            title="Remove embed"
          >
            X
          </button>
        )}

        <div className="embed-header">
          <span className={getBadgeClass()}>YouTube</span>
          {externalUrl && (
            <button
              type="button"
              onClick={handleOpenLink}
              className="embed-open-link-button"
              title="Open on YouTube"
            >
              Open on YouTube
            </button>
          )}
        </div>

        {/* Video Container - Show thumbnail or iframe */}
        <div className="youtube-video-container">
          {showYouTubePlayer ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="youtube-iframe"
            />
          ) : (
            <div
              className="youtube-thumbnail-container"
              onClick={handlePlayYouTube}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePlayYouTube();
                }
              }}
              aria-label={`Play ${title}`}
              style={{
                backgroundImage: `url(${thumbnailUrl}), url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="youtube-play-button">
                <svg viewBox="0 0 68 48" className="youtube-play-icon">
                  <path
                    className="youtube-play-bg"
                    d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
                    fill="#FF0000"
                  />
                  <path d="M 45,24 27,14 27,34" fill="#fff" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Video Metadata */}
        <div className="youtube-metadata">
          <h4 className="youtube-title">{title}</h4>
          {authorName && (
            <p className="youtube-channel">
              {youtubeData?.authorUrl ? (
                <a
                  href={youtubeData.authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="youtube-channel-link"
                >
                  {authorName}
                </a>
              ) : (
                authorName
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render X/Twitter and other embeds
  return (
    <div className="social-media-embed-card">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="embed-remove-button"
          aria-label="Remove embed"
          title="Remove embed"
        >
          X
        </button>
      )}

      {embedHtml ? (
        <div
          ref={embedContainerRef}
          className="embed-content"
        />
      ) : (
        <div className="embed-fallback">
          <p>{platformDisplayName} content</p>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="embed-fallback-link"
            >
              View on {platformDisplayName}
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialMediaEmbedCard;
