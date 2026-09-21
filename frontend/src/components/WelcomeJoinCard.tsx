import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import './WelcomeJoinCard.css';

/**
 * WelcomeJoinCard - the "first 30 seconds" call to action.
 *
 * New users land on the Everything feed with no church or family group. This card
 * sits at the top of the feed until they have BOTH a church primary and a family
 * primary, giving them a labeled button for each instead of an unlabeled header icon.
 *
 * "Later" snoozes the card for SNOOZE_DAYS. Because the card also disappears on its
 * own once both primaries exist, the snooze is only a courtesy for people who
 * genuinely want to browse first.
 */

const SNOOZE_DAYS = 7;
const STORAGE_PREFIX = 'welcomeJoinCard:dismissedAt:';

const storageKeyFor = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const readSnoozedUntil = (userId: string): number | null => {
  try {
    const raw = window.localStorage.getItem(storageKeyFor(userId));
    if (!raw) return null;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return null;
    return dismissedAt + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return null;
  }
};

const firstNameOf = (fullName?: string | null): string => {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0] || '';
};

const WelcomeJoinCard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { churchPrimary, familyPrimary, loading } = useOrganization();

  const userId = user?.userId || user?.id || '';
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    setSnoozedUntil(readSnoozedUntil(userId));
  }, [userId]);

  const needsChurch = !churchPrimary;
  const needsFamily = !familyPrimary;

  const isSnoozed = useMemo(
    () => snoozedUntil !== null && snoozedUntil > Date.now(),
    [snoozedUntil]
  );

  const handleDismiss = useCallback(() => {
    const now = Date.now();
    if (userId) {
      try {
        window.localStorage.setItem(storageKeyFor(userId), String(now));
      } catch {
        // localStorage may be unavailable (private mode); the in-memory state still hides the card
      }
    }
    setSnoozedUntil(now + SNOOZE_DAYS * 24 * 60 * 60 * 1000);
  }, [userId]);

  if (loading || isSnoozed || (!needsChurch && !needsFamily)) {
    return null;
  }

  const firstName = firstNameOf(user?.name);
  const greeting = firstName ? `👋 Welcome, ${firstName}!` : '👋 Welcome!';

  let message: string;
  if (needsChurch && needsFamily) {
    message = 'Make this feed yours - find your church and join your family group.';
  } else if (needsChurch) {
    message = 'One more step - connect with your church to see its prayers, events and posts.';
  } else {
    message = 'Join your family group to share moments with the people closest to you.';
  }

  return (
    <div className="welcome-join-card" role="region" aria-label="Get connected">
      <div className="welcome-join-card__header">
        <div className="welcome-join-card__text">
          <div className="welcome-join-card__title">{greeting}</div>
          <div className="welcome-join-card__message">{message}</div>
        </div>
        <button
          type="button"
          className="welcome-join-card__dismiss"
          onClick={handleDismiss}
          aria-label="Hide this for now"
          title="Hide this for now"
        >
          ✕
        </button>
      </div>

      <div className="welcome-join-card__actions">
        {needsChurch && (
          <button
            type="button"
            className="welcome-join-card__button welcome-join-card__button--church"
            onClick={() => navigate('/organizations?focus=church')}
          >
            <span className="welcome-join-card__button-icon" aria-hidden="true">⛪</span>
            <span>Find my church</span>
          </button>
        )}
        {needsFamily && (
          <button
            type="button"
            className="welcome-join-card__button welcome-join-card__button--family"
            onClick={() => navigate('/organizations?focus=family')}
          >
            <span className="welcome-join-card__button-icon" aria-hidden="true">👨‍👩‍👧</span>
            <span>Join my family</span>
          </button>
        )}
      </div>

      <button type="button" className="welcome-join-card__later" onClick={handleDismiss}>
        Later
      </button>
    </div>
  );
};

export default WelcomeJoinCard;
