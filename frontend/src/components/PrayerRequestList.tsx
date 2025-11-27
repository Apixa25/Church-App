import React, { useState, useEffect, useCallback } from 'react';
import { 
  PrayerRequest, 
  PrayerListResponse,
  PrayerCategory,
  PrayerStatus,
  PRAYER_CATEGORY_LABELS,
  PRAYER_STATUS_LABELS
} from '../types/Prayer';
import { prayerAPI, handleApiError } from '../services/prayerApi';
import { useActiveContext } from '../contexts/ActiveContextContext';
import PrayerRequestCard from './PrayerRequestCard';

interface PrayerRequestListProps {
  onEditPrayer?: (prayer: PrayerRequest) => void;
  onDeletePrayer?: (prayerId: string) => void;
  onViewPrayer?: (prayer: PrayerRequest) => void;
  showActions?: boolean;
  compact?: boolean;
  filter?: {
    category?: PrayerCategory;
    status?: PrayerStatus;
    search?: string;
    myPrayers?: boolean;
  };
}

const PrayerRequestList: React.FC<PrayerRequestListProps> = ({
  onEditPrayer,
  onDeletePrayer,
  onViewPrayer,
  showActions = true,
  compact = false,
  filter = {}
}) => {
  const { activeOrganizationId } = useActiveContext();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pageSize = 20;

  const loadPrayers = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      }

      let response;

      if (filter.myPrayers) {
        // Load user's own prayers
        response = await prayerAPI.getMyPrayerRequests();
        const prayerList = response.data;
        
        if (append) {
          setPrayers(prev => [...prev, ...prayerList]);
        } else {
          setPrayers(prayerList);
        }
        
        setTotalElements(prayerList.length);
        setHasMore(false); // My prayers endpoint doesn't support pagination
        
      } else if (filter.search) {
        // Search prayers
        response = await prayerAPI.searchPrayerRequests(filter.search, pageNum, pageSize);
        const prayerList = response.data as PrayerListResponse;
        
        if (append) {
          setPrayers(prev => [...prev, ...prayerList.content]);
        } else {
          setPrayers(prayerList.content);
        }
        
        setTotalElements(prayerList.totalElements);
        setHasMore(!prayerList.last);
        
      } else if (filter.category) {
        // Filter by category
        response = await prayerAPI.getPrayerRequestsByCategory(filter.category, pageNum, pageSize);
        const prayerList = response.data as PrayerListResponse;
        
        if (append) {
          setPrayers(prev => [...prev, ...prayerList.content]);
        } else {
          setPrayers(prayerList.content);
        }
        
        setTotalElements(prayerList.totalElements);
        setHasMore(!prayerList.last);
        
      } else if (filter.status) {
        // Filter by status
        response = await prayerAPI.getPrayerRequestsByStatus(filter.status, pageNum, pageSize);
        const prayerList = response.data as PrayerListResponse;
        
        if (append) {
          setPrayers(prev => [...prev, ...prayerList.content]);
        } else {
          setPrayers(prayerList.content);
        }
        
        setTotalElements(prayerList.totalElements);
        setHasMore(!prayerList.last);
        
      } else {
        // Load all prayers for the active organization
        response = await prayerAPI.getAllPrayerRequests(pageNum, pageSize, activeOrganizationId || undefined);
        const prayerList = response.data as PrayerListResponse;
        
        if (append) {
          setPrayers(prev => [...prev, ...prayerList.content]);
        } else {
          setPrayers(prayerList.content);
        }
        
        setTotalElements(prayerList.totalElements);
        setHasMore(!prayerList.last);
      }

      setError(null);
    } catch (err: any) {
      setError(handleApiError(err));
      console.error('Error loading prayers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, activeOrganizationId]); // Include activeOrganizationId in dependencies

  useEffect(() => {
    setPage(0);
    setPrayers([]);
    setHasMore(true);
    loadPrayers(0, false);
  }, [loadPrayers]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPrayers(nextPage, true);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    setPage(0);
    setPrayers([]);
    setHasMore(true);
    loadPrayers(0, false);
  };

  const handleDelete = async (prayerId: string) => {
    if (window.confirm('Are you sure you want to delete this prayer request?')) {
      try {
        await prayerAPI.deletePrayerRequest(prayerId);
        setPrayers(prev => prev.filter(p => p.id !== prayerId));
        setTotalElements(prev => prev - 1);
        
        if (onDeletePrayer) {
          onDeletePrayer(prayerId);
        }
      } catch (err: any) {
        setError(handleApiError(err));
      }
    }
  };

  const getFilterDescription = () => {
    if (filter.myPrayers) return 'My Prayer Requests';
    if (filter.search) return `Search results for "${filter.search}"`;
    if (filter.category) return `${PRAYER_CATEGORY_LABELS[filter.category]} Prayers`;
    if (filter.status) return `${PRAYER_STATUS_LABELS[filter.status]} Prayers`;
    return 'All Prayer Requests';
  };

  if (loading && prayers.length === 0) {
    return (
      <div className="prayer-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading prayer requests...</p>
      </div>
    );
  }

  return (
    <div className="prayer-request-list">
      <div className="list-header">
        <div className="list-info">
          <h2 className="list-title">{getFilterDescription()}</h2>
          <span className="prayer-count">
            {totalElements} {totalElements === 1 ? 'prayer' : 'prayers'}
          </span>
        </div>
        
        <button 
          className="refresh-btn"
          onClick={refresh}
          disabled={refreshing}
          title="Refresh prayer list"
        >
          {refreshing ? '⟳' : '↻'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="dismiss-error">×</button>
        </div>
      )}

      {prayers.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🙏</div>
          <h3>No Prayer Requests Found</h3>
          <p>
            {filter.myPrayers 
              ? "You haven't submitted any prayer requests yet."
              : filter.search
              ? "No prayers match your search criteria."
              : "There are no prayer requests to display."
            }
          </p>
        </div>
      )}

      <div className="prayer-cards">
        {prayers.map((prayer) => (
          <PrayerRequestCard
            key={prayer.id}
            prayer={prayer}
            onEdit={onEditPrayer}
            onDelete={handleDelete}
            onViewDetails={onViewPrayer}
            showActions={showActions}
            compact={compact}
          />
        ))}
      </div>

      {hasMore && prayers.length > 0 && (
        <div className="load-more-section">
          <button 
            className="load-more-btn"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner small"></span>
                Loading more...
              </>
            ) : (
              `Load More Prayers`
            )}
          </button>
        </div>
      )}

      {loading && prayers.length > 0 && (
        <div className="loading-more">
          <div className="loading-spinner small"></div>
          <span>Loading more prayers...</span>
        </div>
      )}

      <style>{`
        .prayer-request-list {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border-primary);
        }

        .list-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .list-title {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .prayer-count {
          color: var(--text-tertiary);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .refresh-btn {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all var(--transition-base);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .refresh-btn:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
          transform: rotate(180deg);
          box-shadow: 0 0 12px var(--button-primary-glow);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          position: relative;
        }

        .dismiss-error {
          background: none;
          border: none;
          color: var(--error);
          cursor: pointer;
          padding: 0 0.5rem;
          margin-left: auto;
          font-size: 1.2rem;
          opacity: 0.7;
        }

        .dismiss-error:hover {
          opacity: 1;
        }

        .prayer-list-loading {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-tertiary);
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-tertiary);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          max-width: 400px;
          margin: 0 auto;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .prayer-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .load-more-section {
          text-align: center;
          margin-top: 2rem;
        }

        .load-more-btn {
          background: var(--accent-primary);
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: var(--border-radius-pill);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 8px var(--button-primary-glow);
        }

        .load-more-btn:hover:not(:disabled) {
          background: var(--accent-primary-dark);
          transform: translateY(-1px);
          box-shadow: var(--glow-blue);
        }

        .load-more-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-more {
          text-align: center;
          padding: 1rem;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid var(--bg-tertiary);
          border-top: 3px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
          box-shadow: 0 0 12px var(--button-primary-glow);
        }

        .loading-spinner.small {
          width: 1rem;
          height: 1rem;
          border-width: 2px;
          margin: 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .prayer-request-list {
            padding: 0.5rem;
          }

          .list-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .list-title {
            font-size: 1.25rem;
          }

          .prayer-cards {
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PrayerRequestList;