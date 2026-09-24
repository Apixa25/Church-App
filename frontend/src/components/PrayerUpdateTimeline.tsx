import React, { useCallback, useEffect, useState } from 'react';
import {
  PrayerStatus,
  PrayerUpdate,
  PRAYER_STATUS_COLORS,
  PRAYER_STATUS_LABELS
} from '../types/Prayer';
import { prayerUpdateAPI, handleApiError } from '../services/prayerApi';
import { formatFullDate } from '../utils/dateUtils';
import ClickableAvatar from './ClickableAvatar';

interface PrayerUpdateTimelineProps {
  prayerRequestId: string;
  /** The viewer owns this prayer and may post/remove updates. */
  isOwner: boolean;
  currentStatus: PrayerStatus;
  /** Bumped by the parent when a live "prayer_update" event arrives. */
  refreshKey?: number;
  /** Called after an update that also changed the prayer's status, so the parent can refetch. */
  onStatusChanged?: (status: PrayerStatus) => void;
}

const MAX_LENGTH = 2000;

/** Statuses an owner may move to from an update (never ARCHIVED — that's the moderation/hide path). */
const STATUS_OPTIONS: PrayerStatus[] = ['ACTIVE', 'ANSWERED', 'RESOLVED'];

const PrayerUpdateTimeline: React.FC<PrayerUpdateTimelineProps> = ({
  prayerRequestId,
  isOwner,
  currentStatus,
  refreshKey = 0,
  onStatusChanged
}) => {
  const [updates, setUpdates] = useState<PrayerUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [content, setContent] = useState('');
  const [newStatus, setNewStatus] = useState<PrayerStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadUpdates = useCallback(async () => {
    try {
      const response = await prayerUpdateAPI.getUpdates(prayerRequestId);
      setUpdates(response.data);
      setError(null);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [prayerRequestId]);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates, refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setSubmitError('Write a few words about how things are going.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await prayerUpdateAPI.addUpdate(prayerRequestId, {
        content: trimmed,
        newStatus: newStatus || undefined
      });
      setUpdates(prev => [response.data, ...prev]);
      setContent('');
      setComposerOpen(false);
      if (newStatus && newStatus !== currentStatus && onStatusChanged) {
        onStatusChanged(newStatus);
      }
      setNewStatus('');
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (updateId: string) => {
    if (!window.confirm('Remove this update from the timeline?')) return;
    try {
      await prayerUpdateAPI.deleteUpdate(prayerRequestId, updateId);
      setUpdates(prev => prev.filter(u => u.id !== updateId));
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  // Nothing to show for non-owners when the timeline is empty; keep the page quiet.
  if (!isOwner && !loading && updates.length === 0 && !error) {
    return null;
  }

  return (
    <section className="prayer-updates" aria-label="Prayer updates">
      <div className="prayer-updates-header">
        <h3>
          📝 Updates
          {updates.length > 0 && <span className="prayer-updates-count">{updates.length}</span>}
        </h3>
        {isOwner && !composerOpen && (
          <button
            type="button"
            className="prayer-updates-add"
            onClick={() => setComposerOpen(true)}
          >
            + Share an update
          </button>
        )}
      </div>

      {isOwner && composerOpen && (
        <form className="prayer-update-composer" onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="How is it going? Let your church know…"
            rows={3}
            maxLength={MAX_LENGTH}
            disabled={submitting}
            autoFocus
          />
          <div className="prayer-update-composer-row">
            <label className="prayer-update-status-label">
              Also mark as
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as PrayerStatus | '')}
                disabled={submitting}
              >
                <option value="">— no change —</option>
                {STATUS_OPTIONS.filter(s => s !== currentStatus).map(s => (
                  <option key={s} value={s}>{PRAYER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <span className="prayer-update-counter">{content.length}/{MAX_LENGTH}</span>
          </div>
          {submitError && <div className="prayer-update-error">{submitError}</div>}
          <div className="prayer-update-composer-actions">
            <button
              type="button"
              className="prayer-update-cancel"
              onClick={() => { setComposerOpen(false); setContent(''); setNewStatus(''); setSubmitError(null); }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="prayer-update-submit" disabled={submitting || !content.trim()}>
              {submitting ? 'Posting…' : 'Post update'}
            </button>
          </div>
        </form>
      )}

      {error && <div className="prayer-update-error">{error}</div>}

      {loading ? (
        <p className="prayer-updates-empty">Loading updates…</p>
      ) : updates.length === 0 ? (
        isOwner && !composerOpen && (
          <p className="prayer-updates-empty">
            No updates yet. When something changes, share it here so those praying can rejoice with you.
          </p>
        )
      ) : (
        <ol className="prayer-updates-list">
          {updates.map(update => (
            <li key={update.id} className="prayer-update-item">
              <div className="prayer-update-marker" />
              <div className="prayer-update-card">
                <div className="prayer-update-meta">
                  <ClickableAvatar
                    userId={update.authorId ?? undefined}
                    userName={update.authorName}
                    profilePicUrl={update.authorProfilePicUrl ?? undefined}
                    size="small"
                  />
                  <div className="prayer-update-meta-text">
                    <span className="prayer-update-author">{update.authorName}</span>
                    <span className="prayer-update-date">{formatFullDate(update.createdAt)}</span>
                  </div>
                  {update.newStatus && (
                    <span
                      className="prayer-update-status"
                      style={{ backgroundColor: PRAYER_STATUS_COLORS[update.newStatus] }}
                    >
                      Marked {PRAYER_STATUS_LABELS[update.newStatus]}
                    </span>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      className="prayer-update-delete"
                      onClick={() => handleDelete(update.id)}
                      aria-label="Remove update"
                      title="Remove update"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="prayer-update-content">
                  {update.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <style>{`
        .prayer-updates {
          margin: 0 0 2rem 0;
          padding: 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
        }
        .prayer-updates-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .prayer-updates-header h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .prayer-updates-count {
          background: var(--accent-primary, #3498db);
          color: white;
          border-radius: var(--border-radius-pill);
          padding: 0.05rem 0.55rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .prayer-updates-add {
          background: var(--accent-primary, #3498db);
          color: white;
          border: none;
          border-radius: var(--border-radius-pill);
          padding: 0.45rem 0.9rem;
          font-weight: 600;
          cursor: pointer;
        }
        .prayer-updates-add:hover { filter: brightness(1.08); }
        .prayer-update-composer {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }
        .prayer-update-composer textarea {
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
          padding: 0.75rem;
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          background: var(--bg-primary);
          color: var(--text-primary);
          font: inherit;
          line-height: 1.5;
        }
        .prayer-update-composer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .prayer-update-status-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .prayer-update-status-label select {
          padding: 0.35rem 0.5rem;
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-sm, 6px);
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .prayer-update-counter {
          color: var(--text-tertiary, var(--text-secondary));
          font-size: 0.8rem;
        }
        .prayer-update-composer-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        .prayer-update-cancel,
        .prayer-update-submit {
          border-radius: var(--border-radius-pill);
          padding: 0.45rem 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .prayer-update-cancel {
          background: transparent;
          border: 1px solid var(--border-primary);
          color: var(--text-secondary);
        }
        .prayer-update-submit {
          background: var(--accent-primary, #3498db);
          border: none;
          color: white;
        }
        .prayer-update-submit:disabled,
        .prayer-updates-add:disabled { opacity: 0.6; cursor: not-allowed; }
        .prayer-update-error {
          color: var(--error-color, #e74c3c);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .prayer-updates-empty {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
        .prayer-updates-list {
          list-style: none;
          margin: 0;
          padding: 0 0 0 1rem;
          border-left: 2px solid var(--border-primary);
        }
        .prayer-update-item {
          position: relative;
          padding: 0 0 1rem 1rem;
        }
        .prayer-update-item:last-child { padding-bottom: 0; }
        .prayer-update-marker {
          position: absolute;
          left: -1.45rem;
          top: 0.9rem;
          width: 0.8rem;
          height: 0.8rem;
          border-radius: 50%;
          background: var(--accent-primary, #3498db);
          border: 2px solid var(--bg-secondary);
        }
        .prayer-update-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          padding: 0.85rem 1rem;
        }
        .prayer-update-meta {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }
        .prayer-update-meta-text {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
          flex: 1;
          min-width: 0;
        }
        .prayer-update-author {
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.95rem;
        }
        .prayer-update-date {
          color: var(--text-secondary);
          font-size: 0.8rem;
        }
        .prayer-update-status {
          color: white;
          border-radius: var(--border-radius-pill);
          padding: 0.15rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .prayer-update-delete {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.2rem 0.4rem;
          border-radius: var(--border-radius-sm, 6px);
        }
        .prayer-update-delete:hover {
          color: var(--error-color, #e74c3c);
          background: var(--bg-secondary);
        }
        .prayer-update-content p {
          margin: 0 0 0.5rem 0;
          color: var(--text-secondary);
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .prayer-update-content p:last-child { margin-bottom: 0; }
      `}</style>
    </section>
  );
};

export default PrayerUpdateTimeline;
