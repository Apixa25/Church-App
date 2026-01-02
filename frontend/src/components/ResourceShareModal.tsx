import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { Resource, getResourceCategoryLabel, formatFileSize, getFileIconByType } from '../types/Resource';
import { resourceAPI } from '../services/resourceApi';
import './ResourceShareModal.css';

interface ResourceShareModalProps {
  resource: Resource;
  isOpen: boolean;
  onClose: () => void;
}

const ResourceShareModal: React.FC<ResourceShareModalProps> = ({
  resource,
  isOpen,
  onClose
}) => {
  const [externalShareMessage, setExternalShareMessage] = useState('');
  const [externalShareError, setExternalShareError] = useState('');
  const ignoreBackdropClick = useRef(false);
  const cleanupBackdropGuard = useRef<number | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const previousBodyOverflow = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const node = document.createElement('div');
    node.setAttribute('data-resource-share-modal-root', 'true');
    modalRootRef.current = node;
    document.body.appendChild(node);
    return () => {
      if (modalRootRef.current) {
        document.body.removeChild(modalRootRef.current);
        modalRootRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (!isOpen) {
      if (previousBodyOverflow.current !== null) {
        document.body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      }
      return;
    }
    const body = document.body;
    ignoreBackdropClick.current = true;
    cleanupBackdropGuard.current = window.setTimeout(() => {
      ignoreBackdropClick.current = false;
    }, 0);
    if (previousBodyOverflow.current === null) {
      previousBodyOverflow.current = body.style.overflow || '';
      body.style.overflow = 'hidden';
    }
    return () => {
      if (cleanupBackdropGuard.current !== null) {
        window.clearTimeout(cleanupBackdropGuard.current);
      }
      cleanupBackdropGuard.current = null;
      ignoreBackdropClick.current = false;
      if (previousBodyOverflow.current !== null) {
        body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      }
    };
  }, [isOpen]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/public/resources/${resource.id}/preview`;
    }
    const origin = window.location?.origin || '';
    return `${origin}/public/resources/${resource.id}/preview`;
  }, [resource.id]);

  const directDownloadUrl = resource.fileUrl || '';

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (ignoreBackdropClick.current) {
      ignoreBackdropClick.current = false;
      return;
    }
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleCopyLink = async () => {
    setExternalShareMessage('');
    setExternalShareError('');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const tempInput = document.createElement('input');
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-1000px';
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      // Track the share
      try {
        await resourceAPI.trackShare(resource.id);
      } catch (err) {
        console.error('Failed to track share:', err);
        // Don't show error to user - tracking is secondary
      }

      setExternalShareMessage('Link copied! Paste it in a post or share it anywhere.');
    } catch (err) {
      console.error('Failed to copy share link:', err);
      setExternalShareError('Unable to copy automatically. Please copy the link manually.');
    }
  };

  const handleCopyDirectLink = async () => {
    setExternalShareMessage('');
    setExternalShareError('');

    if (!directDownloadUrl) {
      setExternalShareError('No direct download link available for this resource.');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(directDownloadUrl);
      } else {
        const tempInput = document.createElement('input');
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-1000px';
        tempInput.value = directDownloadUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      setExternalShareMessage('Direct download link copied!');
    } catch (err) {
      console.error('Failed to copy direct link:', err);
      setExternalShareError('Unable to copy automatically. Please copy the link manually.');
    }
  };

  const handleNativeShare = async () => {
    setExternalShareMessage('');
    setExternalShareError('');

    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorShare.share({
          title: resource.title,
          text: `Check out this resource: ${resource.title}`,
          url: shareUrl,
          dialogTitle: 'Share Resource'
        });

        // Track the share
        try {
          await resourceAPI.trackShare(resource.id);
        } catch (err) {
          console.error('Failed to track share:', err);
        }
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: resource.title,
          text: `Check out this resource: ${resource.title}`,
          url: shareUrl
        });

        // Track the share
        try {
          await resourceAPI.trackShare(resource.id);
        } catch (err) {
          console.error('Failed to track share:', err);
        }
        return;
      }

      await handleCopyLink();
    } catch (err) {
      console.error('Failed to open native share dialog:', err);
      setExternalShareError('Unable to open the device share menu. Try copying the link instead.');
    }
  };

  if (!isOpen || !modalRootRef.current) return null;

  return createPortal(
    <div
      className="resource-share-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="resource-share-modal-container">
        {/* Header */}
        <div className="resource-share-modal-header">
          <h2>Share Resource</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close share modal"
          >
            ✕
          </button>
        </div>

        {/* Resource Preview */}
        <div className="resource-preview-section">
          <div className="resource-preview-icon">
            {resource.youtubeThumbnailUrl ? (
              <img
                src={resource.youtubeThumbnailUrl}
                alt={resource.title}
                className="resource-thumbnail"
              />
            ) : (
              <span className="resource-file-icon">{getFileIconByType(resource.fileType)}</span>
            )}
          </div>
          <div className="resource-preview-info">
            <span className="resource-category-badge">
              {getResourceCategoryLabel(resource.category)}
            </span>
            <h3 className="resource-title">{resource.title}</h3>
            {resource.fileName && (
              <div className="resource-file-info">
                <span className="file-name">{resource.fileName}</span>
                {resource.fileSize && (
                  <span className="file-size">{formatFileSize(resource.fileSize)}</span>
                )}
              </div>
            )}
            <div className="resource-stats">
              <span>⬇️ {resource.downloadCount} downloads</span>
              <span>🔗 {resource.shareCount || 0} shares</span>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="share-external">
          <h3>Share this resource</h3>
          <p className="share-external-description">
            Copy the shareable link to post it in your group, message, or anywhere else.
            Recipients can preview and download the resource.
          </p>

          <div className="share-link-section">
            <label>Preview Link</label>
            <div className="share-link-row">
              <code className="share-link-display">{shareUrl}</code>
              <button className="share-button secondary" onClick={handleCopyLink}>
                Copy Link
              </button>
            </div>
          </div>

          {directDownloadUrl && (
            <div className="share-link-section">
              <label>Direct Download Link</label>
              <div className="share-link-row">
                <code className="share-link-display">{directDownloadUrl}</code>
                <button className="share-button secondary" onClick={handleCopyDirectLink}>
                  Copy
                </button>
              </div>
            </div>
          )}

          <button className="share-button outline full-width" onClick={handleNativeShare}>
            Use Device Share Menu
          </button>

          {externalShareMessage && (
            <div className="share-external-message success">
              {externalShareMessage}
            </div>
          )}
          {externalShareError && (
            <div className="share-external-message error">
              {externalShareError}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="resource-share-modal-actions">
          <button
            className="cancel-button"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    modalRootRef.current
  );
};

export default ResourceShareModal;
