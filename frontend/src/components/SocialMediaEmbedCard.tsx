import React, { useEffect, useRef } from 'react';
import { SocialMediaPlatform, getPlatformDisplayName } from '../utils/socialMediaUtils';
import './SocialMediaEmbedCard.css';

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
 * Safely renders oEmbed HTML from social media platforms
 */
const SocialMediaEmbedCard: React.FC<SocialMediaEmbedCardProps> = ({
  embedHtml,
  externalUrl,
  platform,
  onRemove
}) => {
  const embedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  const platformDisplayName = getPlatformDisplayName(platform as SocialMediaPlatform);

  if (!embedHtml && !externalUrl) {
    return null;
  }

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
          ✕
        </button>
      )}
      
      <div className="embed-header">
        <span className="embed-platform-badge">{platformDisplayName}</span>
        {externalUrl && (
          <button
            type="button"
            onClick={handleOpenLink}
            className="embed-open-link-button"
            title="Open original post"
          >
            Open on {platformDisplayName} →
          </button>
        )}
      </div>

      {embedHtml ? (
        <div 
          ref={embedContainerRef}
          className="embed-content"
          dangerouslySetInnerHTML={{ __html: embedHtml }}
        />
      ) : (
        <div className="embed-fallback">
          <p>🔗 {platformDisplayName} content</p>
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

