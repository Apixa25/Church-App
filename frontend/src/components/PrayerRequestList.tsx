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
        // Load all prayers
        response = await prayerAPI.getAllPrayerRequests(pageNum, pageSize);
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
  }, [filter]);

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

      <style jsx>{`
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
          border-bottom: 2px solid #e1e8ed;
        }

        .list-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .list-title {
          margin: 0;
          color: #2c3e50;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .prayer-count {
          color: #7f8c8d;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .refresh-btn {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #e9ecef;
          border-color: #dee2e6;
          transform: rotate(180deg);
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
        }

        .dismiss-error {
          background: none;
          border: none;
          color: #c33;
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
          color: #7f8c8d;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #7f8c8d;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: #34495e;
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
        }

        .empty-state p {
          margin: 0;
          max-width: 400px;
          margin: 0 auto;
          line-height: 1.5;
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
          background: #3498db;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .load-more-btn:hover:not(:disabled) {
          background: #2980b9;
          transform: translateY(-1px);
        }

        .load-more-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-more {
          text-align: center;
          padding: 1rem;
          color: #7f8c8d;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e1e8ed;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
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