import React, { useEffect, useRef, useState } from 'react';
import { PostReactionCounts, PostReactionType } from '../types/Post';
import './PostReactionButton.css';

interface ReactionOption {
  type: PostReactionType;
  emoji: string;
  label: string;
}

const REACTION_OPTIONS: ReactionOption[] = [
  { type: PostReactionType.HEART, emoji: '❤️', label: 'Love' },
  { type: PostReactionType.LIKE, emoji: '👍', label: 'Like' },
  { type: PostReactionType.DISLIKE, emoji: '👎', label: 'Dislike' },
  { type: PostReactionType.LAUGH, emoji: '😆', label: 'Laugh' },
  { type: PostReactionType.WOW, emoji: '😮', label: 'Wow' },
  { type: PostReactionType.SAD, emoji: '😢', label: 'Sad' },
  { type: PostReactionType.ANGRY, emoji: '😠', label: 'Angry' }
];

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_DISTANCE = 12;

interface PostReactionButtonProps {
  currentReaction?: PostReactionType | null;
  reactionCounts?: PostReactionCounts;
  totalCount: number;
  showTotalCount?: boolean;
  disabled?: boolean;
  onReactionSelect: (reaction: PostReactionType | null) => Promise<void> | void;
}

const getReactionOption = (reaction?: PostReactionType | null): ReactionOption =>
  REACTION_OPTIONS.find(option => option.type === reaction) || REACTION_OPTIONS[0];

const PostReactionButton: React.FC<PostReactionButtonProps> = ({
  currentReaction,
  reactionCounts,
  totalCount,
  showTotalCount = true,
  disabled = false,
  onReactionSelect
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const suppressNextClickRef = useRef(false);

  const selectedOption = getReactionOption(currentReaction);

  const clearTimers = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!isPickerOpen) return;

    const closePickerOnScroll = () => {
      setIsPickerOpen(false);
      clearTimers();
    };

    window.addEventListener('scroll', closePickerOnScroll, true);
    window.addEventListener('wheel', closePickerOnScroll, { passive: true });
    window.addEventListener('touchmove', closePickerOnScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', closePickerOnScroll, true);
      window.removeEventListener('wheel', closePickerOnScroll);
      window.removeEventListener('touchmove', closePickerOnScroll);
    };
  }, [isPickerOpen]);

  const handleQuickReaction = async () => {
    if (disabled || isSubmitting) return;

    const nextReaction = currentReaction === PostReactionType.HEART ? null : PostReactionType.HEART;
    setIsSubmitting(true);
    try {
      await onReactionSelect(nextReaction);
    } finally {
      setIsSubmitting(false);
      setIsPickerOpen(false);
    }
  };

  const handleReactionChoice = async (reaction: PostReactionType) => {
    if (disabled || isSubmitting) return;

    const nextReaction = currentReaction === reaction ? null : reaction;
    setIsSubmitting(true);
    try {
      await onReactionSelect(nextReaction);
    } finally {
      setIsSubmitting(false);
      setIsPickerOpen(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isSubmitting) return;

    clearTimers();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTriggeredRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      suppressNextClickRef.current = true;
      setIsPickerOpen(true);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStartRef.current || !longPressTimerRef.current) return;

    const dx = Math.abs(event.clientX - pointerStartRef.current.x);
    const dy = Math.abs(event.clientY - pointerStartRef.current.y);
    if (dx > MOVE_CANCEL_DISTANCE || dy > MOVE_CANCEL_DISTANCE) {
      clearTimers();
      pointerStartRef.current = null;
    }
  };

  const handlePointerUp = async () => {
    const wasLongPress = longPressTriggeredRef.current;
    clearTimers();
    pointerStartRef.current = null;

    if (!wasLongPress && !isPickerOpen) {
      await handleQuickReaction();
    }
  };

  const handlePointerCancel = () => {
    clearTimers();
    pointerStartRef.current = null;
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressNextClickRef.current) {
      event.preventDefault();
      suppressNextClickRef.current = false;
    }
  };

  const handleMouseEnter = () => {
    if (disabled || isSubmitting) return;
    hoverTimerRef.current = window.setTimeout(() => {
      setIsPickerOpen(true);
    }, 450);
  };

  const handleMouseLeave = () => {
    if (!isPickerOpen) {
      clearTimers();
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      await handleQuickReaction();
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      setIsPickerOpen(true);
    }

    if (event.key === 'Escape') {
      setIsPickerOpen(false);
    }
  };

  return (
    <div
      className={`post-reaction-control ${isPickerOpen ? 'picker-open' : ''}`}
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
    >
      {isPickerOpen && (
        <div className="reaction-picker" role="menu" aria-label="Choose a reaction">
          {REACTION_OPTIONS.map((option, index) => (
            <button
              key={option.type}
              type="button"
              className={`reaction-petal reaction-petal-${index} ${currentReaction === option.type ? 'selected' : ''}`}
              onClick={() => handleReactionChoice(option.type)}
              disabled={disabled || isSubmitting}
              role="menuitemradio"
              aria-checked={currentReaction === option.type}
              aria-label={`${option.label}${reactionCounts?.[option.type] ? ` (${reactionCounts[option.type]})` : ''}`}
              title={option.label}
            >
              <span className="reaction-petal-emoji">{option.emoji}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className={`post-reaction-trigger action-button like-button ${currentReaction ? 'liked' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSubmitting}
        aria-haspopup="menu"
        aria-expanded={isPickerOpen}
        aria-label={currentReaction ? `${selectedOption.label} reaction. Hold to change.` : 'React to post. Hold to choose an emotion.'}
        aria-pressed={Boolean(currentReaction)}
      >
        {currentReaction ? (
          <span className="selected-reaction">{selectedOption.emoji}</span>
        ) : (
          <span className="mini-reaction-flower" aria-hidden="true">
            {REACTION_OPTIONS.map((option, index) => (
              <span key={option.type} className={`mini-reaction-petal mini-reaction-petal-${index}`}>
                {option.emoji}
              </span>
            ))}
          </span>
        )}
        {showTotalCount && totalCount > 0 && <span className="reaction-total">{totalCount}</span>}
      </button>
    </div>
  );
};

export default PostReactionButton;
