import React, { useMemo } from 'react';
import { WorshipRoomParticipant, WorshipAvatar } from '../types/Worship';
import AnimatedAvatar from './AnimatedAvatar';
import './DanceFloor.css';

interface DanceFloorProps {
  participants: WorshipRoomParticipant[];
  currentLeaderId?: string;
  maxVisible?: number;
}

/**
 * Default avatar used when a participant hasn't selected one.
 * This will be replaced by data from the database once avatars are loaded.
 */
const DEFAULT_AVATAR: WorshipAvatar = {
  id: 'default',
  name: 'Worshiper',
  spriteSheetUrl: '/avatars/worshiper.png',
  frameCount: 8,
  frameWidth: 64,
  frameHeight: 64,
  animationDurationMs: 800,
};

interface PositionedParticipant extends WorshipRoomParticipant {
  posX: number;      // Horizontal position (percentage)
  posY: number;      // Vertical position (pixels from top)
  zIndex: number;    // Layer ordering (back to front)
  scale: number;     // Size scale (smaller in back)
}

/**
 * DanceFloor - Displays participants as animated avatars in a crowd arrangement.
 * Inspired by plug.dj's virtual dance floor where users' avatars dance together.
 */
const DanceFloor: React.FC<DanceFloorProps> = ({
  participants,
  currentLeaderId,
  maxVisible = 30,
}) => {
  // Calculate positions for avatars in a crowd arrangement
  const positionedParticipants = useMemo(() => {
    // Filter to active participants only
    const activeParticipants = participants
      .filter(p => p.isActive)
      .slice(0, maxVisible);

    const total = activeParticipants.length;
    if (total === 0) return [];

    // Arrange in rows (max 10 per row, staggered)
    const maxPerRow = 10;
    const rows = Math.ceil(total / maxPerRow);

    return activeParticipants.map((participant, index): PositionedParticipant => {
      const row = Math.floor(index / maxPerRow);
      const posInRow = index % maxPerRow;
      const rowCount = row === rows - 1 ? total - (row * maxPerRow) : maxPerRow;

      // Calculate horizontal position (centered in each row)
      // Spread out across 80% of the width (10% margin on each side)
      const baseSpread = 80;
      const spacing = rowCount > 1 ? baseSpread / (rowCount - 1) : 0;
      const startX = rowCount > 1 ? (100 - baseSpread) / 2 : 50;
      const xPos = rowCount > 1 ? startX + (posInRow * spacing) : 50;

      // Add slight random variation for natural look (deterministic based on index)
      const xVariation = Math.sin(index * 2.5) * 3;

      // Calculate vertical position (back rows higher up)
      const baseY = 30; // Start position from top
      const rowSpacing = 45; // Pixels between rows
      const yPos = baseY + (row * rowSpacing);

      // Back rows are smaller (perspective effect)
      const scale = 1 - (row * 0.08);

      return {
        ...participant,
        posX: xPos + xVariation,
        posY: yPos,
        zIndex: row + 1, // Back rows have lower z-index
        scale: Math.max(scale, 0.7), // Don't go too small
      };
    });
  }, [participants, maxVisible]);

  const activeCount = participants.filter(p => p.isActive).length;

  if (activeCount === 0) {
    return (
      <div className="dance-floor dance-floor-empty">
        <div className="dance-floor-empty-message">
          <span className="empty-icon">🎵</span>
          <span>No one in the room yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dance-floor">
      <div className="dance-floor-stage">
        {positionedParticipants.map((participant) => (
          <div
            key={participant.id}
            className="dance-floor-avatar"
            style={{
              left: `${participant.posX}%`,
              top: `${participant.posY}px`,
              zIndex: participant.zIndex,
              transform: `translateX(-50%) scale(${participant.scale})`,
            }}
          >
            <AnimatedAvatar
              avatar={participant.avatar || DEFAULT_AVATAR}
              userName={participant.userName}
              size="medium"
              showName={true}
              isLeader={participant.userId === currentLeaderId}
            />
          </div>
        ))}
      </div>
      <div className="dance-floor-count">
        <span className="count-icon">👥</span>
        <span>{activeCount} worshiping</span>
      </div>
    </div>
  );
};

export default DanceFloor;
