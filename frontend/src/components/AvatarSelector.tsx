import React, { useState, useEffect } from 'react';
import { worshipAPI } from '../services/worshipApi';
import { WorshipAvatar } from '../types/Worship';
import AnimatedAvatar from './AnimatedAvatar';
import './AvatarSelector.css';

interface AvatarSelectorProps {
  onSelect?: (avatar: WorshipAvatar) => void;
  onClose?: () => void;
}

/**
 * AvatarSelector - Modal/panel for choosing an animated avatar.
 * Displays all available avatars in a grid with live animation preview.
 */
const AvatarSelector: React.FC<AvatarSelectorProps> = ({ onSelect, onClose }) => {
  const [avatars, setAvatars] = useState<WorshipAvatar[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await worshipAPI.getAvatars();
      setAvatars(response.data);

      // Find the currently selected avatar
      const selected = response.data.find(a => a.isSelected);
      if (selected) {
        setSelectedId(selected.id);
      }
    } catch (err) {
      console.error('Failed to load avatars:', err);
      setError('Failed to load avatars. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (avatar: WorshipAvatar) => {
    if (saving || avatar.id === selectedId) return;

    setSaving(true);
    setError(null);

    try {
      await worshipAPI.selectAvatar(avatar.id);
      setSelectedId(avatar.id);

      // Update local state to show new selection
      setAvatars(prev =>
        prev.map(a => ({
          ...a,
          isSelected: a.id === avatar.id,
        }))
      );

      if (onSelect) {
        onSelect(avatar);
      }
    } catch (err) {
      console.error('Failed to select avatar:', err);
      setError('Failed to save selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="avatar-selector">
        <div className="avatar-selector-header">
          <h3>Choose Your Avatar</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close">
              &times;
            </button>
          )}
        </div>
        <div className="avatar-selector-loading">
          <div className="loading-spinner"></div>
          <span>Loading avatars...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="avatar-selector">
      <div className="avatar-selector-header">
        <h3>Choose Your Avatar</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}
      </div>

      {error && (
        <div className="avatar-selector-error">
          {error}
        </div>
      )}

      <p className="avatar-selector-description">
        Select an avatar to represent you on the dance floor
      </p>

      <div className="avatar-selector-grid">
        {avatars.map((avatar) => (
          <button
            key={avatar.id}
            className={`avatar-option ${selectedId === avatar.id ? 'selected' : ''}`}
            onClick={() => handleSelect(avatar)}
            disabled={saving}
            title={avatar.description || avatar.name}
          >
            <div className="avatar-option-preview">
              <AnimatedAvatar
                avatar={avatar}
                userName=""
                showName={false}
                size="large"
              />
            </div>
            <span className="avatar-option-name">{avatar.name}</span>
            {selectedId === avatar.id && (
              <span className="selected-badge">
                <span className="check-icon">✓</span>
                Selected
              </span>
            )}
          </button>
        ))}
      </div>

      {saving && (
        <div className="avatar-selector-saving">
          Saving...
        </div>
      )}
    </div>
  );
};

export default AvatarSelector;
