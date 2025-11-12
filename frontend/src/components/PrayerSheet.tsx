import React, { useState, useEffect } from 'react';
import { PrayerRequest } from '../types/Prayer';
import { prayerAPI, handleApiError } from '../services/prayerApi';
import { parseEventDate } from '../utils/dateUtils';

interface PrayerSheetProps {
  onBack?: () => void;
}

const PrayerSheet: React.FC<PrayerSheetProps> = ({ onBack }) => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrayerSheet();
  }, []);

  const loadPrayerSheet = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await prayerAPI.getPrayerSheet();
      setPrayers(response.data);
    } catch (err: any) {
      setError(handleApiError(err));
      console.error('Error loading prayer sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string | number[]): string => {
    const date = parseEventDate(dateString);
    if (!date) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="prayer-sheet-loading">
        <div className="loading-spinner"></div>
        <p>Loading prayer sheet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prayer-sheet-error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
        {onBack && (
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Prayers
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="prayer-sheet-container">
      <div className="prayer-sheet-header no-print">
        <div className="header-content">
          <h1>📋 Prayer Sheet</h1>
          <p className="sheet-description">
            A chronological list of all active prayer requests for focused prayer time.
          </p>
        </div>
        <div className="header-actions">
          {onBack && (
            <button onClick={onBack} className="btn btn-secondary">
              ← Back to Prayers
            </button>
          )}
          <button onClick={loadPrayerSheet} className="btn btn-secondary" title="Refresh prayer sheet">
            ↻ Refresh
          </button>
          <button onClick={handlePrint} className="btn btn-primary" title="Print or save as PDF">
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      <div className="prayer-sheet-content">
        <div className="sheet-header print-only">
          <h1>Prayer Sheet</h1>
          <p className="sheet-date">Generated: {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <p className="sheet-count">Total Active Prayers: {prayers.length}</p>
        </div>

        {prayers.length === 0 ? (
          <div className="empty-sheet">
            <div className="empty-icon">🙏</div>
            <h2>No Active Prayer Requests</h2>
            <p>There are currently no active prayer requests. Check back later for new prayer requests.</p>
          </div>
        ) : (
          <ol className="prayer-list">
            {prayers.map((prayer, index) => (
              <li key={prayer.id} className="prayer-item">
                <div className="prayer-item-header">
                  <span className="prayer-number">{index + 1}.</span>
                  <p className="prayer-date">📅 {formatDate(prayer.createdAt)}</p>
                </div>
                <h2 className="prayer-title">{prayer.title || 'Untitled Prayer Request'}</h2>
                <div className="prayer-description">
                  {prayer.description ? (
                    prayer.description.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph || '\u00A0'}</p>
                    ))
                  ) : (
                    <p className="no-description">No description provided.</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <style>{`
        .prayer-sheet-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          background: transparent;
          min-height: 100vh;
        }

        .prayer-sheet-loading,
        .prayer-sheet-error {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-primary);
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          border: 4px solid var(--bg-elevated);
          border-top: 4px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
          box-shadow: 0 0 20px var(--button-primary-glow);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .prayer-sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-content h1 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 2rem;
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sheet-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.5;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: var(--border-radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: var(--gradient-primary);
          color: white;
          box-shadow: 0 2px 8px var(--button-primary-glow);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--glow-blue);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          color: var(--text-secondary);
        }

        .btn-secondary:hover {
          background: var(--bg-elevated);
          border-color: var(--border-glow);
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(91, 127, 255, 0.2);
        }

        .prayer-sheet-content {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          padding: 2rem;
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
        }

        .sheet-header.print-only {
          display: none;
        }

        .prayer-list {
          list-style: none;
          counter-reset: prayer-counter;
          padding: 0;
          margin: 0;
        }

        .prayer-item {
          counter-increment: prayer-counter;
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-sm);
          page-break-inside: avoid;
          transition: all var(--transition-base);
        }

        .prayer-item:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--border-glow);
          transform: translateY(-2px);
        }

        .prayer-item:last-child {
          margin-bottom: 0;
        }

        .prayer-item-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .prayer-number {
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .prayer-date {
          margin: 0;
          color: var(--text-tertiary);
          font-size: 0.9rem;
          font-style: italic;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .prayer-title {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.3rem;
          font-weight: 700;
          line-height: 1.4;
          padding-left: calc(1.2rem + 0.75rem);
        }

        .prayer-description {
          margin: 1rem 0 0 0;
          color: var(--text-secondary);
          line-height: 1.7;
          font-size: 1rem;
        }

        .prayer-description p {
          margin: 0 0 0.75rem 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .prayer-description p:last-child {
          margin-bottom: 0;
        }

        .prayer-description .no-description {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .empty-sheet {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-tertiary);
          background: var(--bg-secondary);
          border: 1px dashed var(--border-primary);
          border-radius: var(--border-radius-md);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .empty-sheet h2 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .empty-sheet p {
          margin: 0;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .error-message {
          background-color: rgba(239, 68, 68, 0.15);
          border: 1px solid var(--error);
          color: var(--error);
          padding: 1rem 1.5rem;
          border-radius: var(--border-radius-md);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 8px var(--error-glow);
        }

        .error-icon {
          font-size: 1.2rem;
        }

        /* Print Styles */
        @media print {
          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .prayer-sheet-container {
            padding: 0;
            margin: 0;
            max-width: 100%;
            background: white !important;
          }

          .prayer-sheet-content {
            background: white !important;
            padding: 1.5rem;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }

          .prayer-item {
            background: white !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .sheet-header.print-only {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #000;
          }

          .sheet-header.print-only h1 {
            margin: 0 0 0.5rem 0;
            font-size: 2rem;
            color: #000;
          }

          .sheet-date,
          .sheet-count {
            margin: 0.25rem 0;
            color: #666;
            font-size: 0.9rem;
          }

          .prayer-item {
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid #ddd;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .prayer-item:last-child {
            border-bottom: none;
          }

          .prayer-date {
            color: #666 !important;
            margin: 0 0 0.5rem 0 !important;
          }

          .prayer-title {
            color: #000 !important;
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 0.5rem !important;
            padding-left: calc(1.2rem + 0.75rem) !important;
            -webkit-text-fill-color: #000 !important;
          }

          .prayer-description {
            color: #333 !important;
            margin-top: 1rem;
            line-height: 1.6;
          }

          .prayer-description p {
            margin: 0 0 0.75rem 0;
            line-height: 1.6;
            color: #333 !important;
          }

          .prayer-description .no-description {
            color: #999 !important;
            font-style: italic;
          }

          .prayer-number {
            color: #000 !important;
            -webkit-text-fill-color: #000 !important;
          }

          @page {
            margin: 1in;
            size: letter;
          }

          body {
            background: white;
          }
        }

        @media (max-width: 768px) {
          .prayer-sheet-container {
            padding: 1rem;
          }

          .prayer-sheet-header {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }

          .prayer-sheet-content {
            padding: 1.5rem;
          }

          .prayer-title {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PrayerSheet;

