import React, { useState } from 'react';
import { MediaFile } from '../types/Post';
import ImagePreview from './ImagePreview';
import VideoPlayer from './VideoPlayer';
import './MediaGrid.css';

interface MediaGridProps {
  mediaFiles: MediaFile[];
  onFileRemove?: (index: number) => void;
  onFileEdit?: (index: number, editedFile: MediaFile) => void;
  editable?: boolean;
  maxColumns?: number;
  size?: 'small' | 'medium' | 'large';
  showInfo?: boolean;
  allowFullscreen?: boolean;
  onFullscreen?: (mediaFile: MediaFile, index: number) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  mediaFiles,
  onFileRemove,
  onFileEdit,
  editable = false,
  maxColumns = 3,
  size = 'medium',
  showInfo = true,
  allowFullscreen = true,
  onFullscreen
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleFileRemove = (index: number) => {
    if (onFileRemove) {
      onFileRemove(index);
    }
  };

  const handleFileEdit = (index: number, editedFile: MediaFile) => {
    if (onFileEdit) {
      onFileEdit(index, editedFile);
    }
  };

  const handleFullscreen = (mediaFile: MediaFile, index: number) => {
    setSelectedIndex(index);
    if (onFullscreen) {
      onFullscreen(mediaFile, index);
    }
  };

  const getGridColumns = (fileCount: number): number => {
    if (fileCount === 1) return 1;
    if (fileCount === 2) return 2;
    return Math.min(fileCount, maxColumns);
  };

  const getGridClass = (fileCount: number): string => {
    const columns = getGridColumns(fileCount);
    return `grid-cols-${columns}`;
  };

  const getSizeClass = (): string => {
    switch (size) {
      case 'small': return 'media-grid-small';
      case 'large': return 'media-grid-large';
      default: return 'media-grid-medium';
    }
  };

  if (mediaFiles.length === 0) {
    return (
      <div className={`media-grid empty ${getSizeClass()}`}>
        <div className="empty-state">
          <div className="empty-icon">🖼️</div>
          <div className="empty-text">No media files</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`media-grid ${getGridClass(mediaFiles.length)} ${getSizeClass()}`}>
      {mediaFiles.map((mediaFile, index) => (
        <div key={`${mediaFile.file.name}-${index}`} className="media-grid-item">
          {/* Fullscreen Trigger */}
          {allowFullscreen && (
            <button
              className="fullscreen-trigger"
              onClick={() => handleFullscreen(mediaFile, index)}
              aria-label={`View ${mediaFile.name} in fullscreen`}
              title="View fullscreen"
            />
          )}

          {/* Media Content */}
          {mediaFile.type === 'image' ? (
            <ImagePreview
              mediaFile={mediaFile}
              onRemove={editable && onFileRemove ? () => handleFileRemove(index) : undefined}
              onEdit={editable && onFileEdit ? (editedFile) => handleFileEdit(index, editedFile) : undefined}
              editable={editable}
              size={size}
              showInfo={showInfo}
            />
          ) : (
            <VideoPlayer
              mediaFile={mediaFile}
              onRemove={editable && onFileRemove ? () => handleFileRemove(index) : undefined}
              onEdit={editable && onFileEdit ? (editedFile) => handleFileEdit(index, editedFile) : undefined}
              editable={editable}
              size={size}
              showInfo={showInfo}
              controls={true}
            />
          )}

          {/* File Index Indicator */}
          {mediaFiles.length > 1 && (
            <div className="file-index-indicator">
              {index + 1}
            </div>
          )}

          {/* Selection Indicator */}
          {selectedIndex === index && (
            <div className="selection-indicator">
              <div className="selection-ring"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MediaGrid;
