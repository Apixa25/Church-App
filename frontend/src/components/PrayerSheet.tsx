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
                  <h2 className="prayer-title">{prayer.title}</h2>
                </div>
                <p className="prayer-date">📅 {formatDate(prayer.createdAt)}</p>
                {prayer.description && (
                  <div className="prayer-description">
                    {prayer.description.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                )}
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
          background: var(--bg-primary);
        }

        .prayer-sheet-loading,
        .prayer-sheet-error {
          text-align: center;
          padding: 3rem 1rem;
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          border: 4px solid var(--bg-tertiary);
          border-top: 4px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
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
          padding-bottom: 1.5rem;
          border-bottom: 2px solid var(--border-primary);
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-content h1 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 2rem;
          font-weight: 600;
        }

        .sheet-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1rem;
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
          background: var(--accent-primary);
          color: white;
          box-shadow: 0 2px 8px var(--button-primary-glow);
        }

        .btn-primary:hover {
          background: var(--accent-primary-dark);
          transform: translateY(-1px);
          box-shadow: var(--glow-blue);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          color: var(--text-secondary);
        }

        .btn-secondary:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
        }

        .prayer-sheet-content {
          background: white;
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
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border-primary);
          page-break-inside: avoid;
        }

        .prayer-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .prayer-item-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .prayer-number {
          font-weight: 600;
          color: var(--accent-primary);
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .prayer-title {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          flex: 1;
        }

        .prayer-date {
          margin: 0.5rem 0 1rem 0;
          color: var(--text-tertiary);
          font-size: 0.9rem;
          font-style: italic;
        }

        .prayer-description {
          margin: 1rem 0 0 0;
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 1rem;
        }

        .prayer-description p {
          margin: 0 0 0.75rem 0;
        }

        .prayer-description p:last-child {
          margin-bottom: 0;
        }

        .empty-sheet {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-tertiary);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-sheet h2 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.5rem;
        }

        .empty-sheet p {
          margin: 0;
          max-width: 500px;
          margin: 0 auto;
          line-height: 1.5;
        }

        .error-message {
          background-color: rgba(239, 68, 68, 0.2);
          border: 1px solid var(--error);
          color: var(--error);
          padding: 1rem;
          border-radius: var(--border-radius-md);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
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
            background: white;
          }

          .prayer-sheet-content {
            background: white;
            padding: 1.5rem;
            box-shadow: none;
            border: none;
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

          .prayer-title {
            color: #000;
            font-size: 1.1rem;
          }

          .prayer-date {
            color: #666;
          }

          .prayer-description {
            color: #333;
          }

          .prayer-number {
            color: #000;
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

