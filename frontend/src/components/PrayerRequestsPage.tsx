import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  PrayerRequest, 
  PrayerStats,
  PrayerCategory,
  PrayerStatus,
  PRAYER_CATEGORY_LABELS,
  PRAYER_STATUS_LABELS
} from '../types/Prayer';
import { prayerAPI } from '../services/prayerApi';
import PrayerRequestForm from './PrayerRequestForm';
import PrayerRequestList from './PrayerRequestList';
import PrayerRequestDetail from './PrayerRequestDetail';
import PrayerSheet from './PrayerSheet';

type ViewMode = 'list' | 'create' | 'edit' | 'detail' | 'sheet';

const PrayerRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [stats, setStats] = useState<PrayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [activeFilter, setActiveFilter] = useState<{
    category?: PrayerCategory;
    status?: PrayerStatus;
    search?: string;
    myPrayers?: boolean;
  }>({});
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadStats();
    
    // Handle URL parameters
    const prayerId = searchParams.get('id');
    const mode = searchParams.get('mode') as ViewMode;
    
    if (prayerId && mode === 'detail') {
      setViewMode('detail');
      // The detail component will load the prayer
    } else if (mode === 'create') {
      setViewMode('create');
    } else if (mode === 'sheet') {
      setViewMode('sheet');
    }
  }, [searchParams]);

  const loadStats = async () => {
    try {
      const response = await prayerAPI.getPrayerStats();
      setStats(response.data);
    } catch (err: any) {
      console.error('Error loading prayer stats:', err);
    }
  };

  const handleCreateSuccess = (prayer: PrayerRequest) => {
    setViewMode('detail');
    setSelectedPrayer(prayer);
    setSearchParams({ mode: 'detail', id: prayer.id });
    loadStats(); // Refresh stats
  };

  const handleEditSuccess = (prayer: PrayerRequest) => {
    setViewMode('detail');
    setSelectedPrayer(prayer);
    setSearchParams({ mode: 'detail', id: prayer.id });
  };

  const handleEditPrayer = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
    setViewMode('edit');
    setSearchParams({ mode: 'edit', id: prayer.id });
  };

  const handleViewPrayer = (prayer: PrayerRequest) => {
    setSelectedPrayer(prayer);
    setViewMode('detail');
    setSearchParams({ mode: 'detail', id: prayer.id });
  };

  const handleDeletePrayer = (prayerId: string) => {
    if (selectedPrayer?.id === prayerId) {
      setSelectedPrayer(null);
      setViewMode('list');
      setSearchParams({});
    }
    loadStats(); // Refresh stats
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPrayer(null);
    setSearchParams({});
  };

  const handleFilterChange = (filterType: string, value: any) => {
    const newFilter = { ...activeFilter };
    
    if (filterType === 'category') {
      newFilter.category = value === 'all' ? undefined : value;
    } else if (filterType === 'status') {
      newFilter.status = value === 'all' ? undefined : value;
    } else if (filterType === 'myPrayers') {
      newFilter.myPrayers = value;
    }
    
    // Clear other filters when switching to myPrayers
    if (filterType === 'myPrayers' && value) {
      newFilter.category = undefined;
      newFilter.status = undefined;
      newFilter.search = undefined;
    }
    
    setActiveFilter(newFilter);
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      setActiveFilter({
        search: searchText.trim(),
        myPrayers: false
      });
    } else {
      const newFilter = { ...activeFilter };
      delete newFilter.search;
      setActiveFilter(newFilter);
    }
  };

  const clearFilters = () => {
    setActiveFilter({});
    setSearchText('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilter.category) count++;
    if (activeFilter.status) count++;
    if (activeFilter.search) count++;
    if (activeFilter.myPrayers) count++;
    return count;
  };

  if (viewMode === 'detail') {
    return (
      <PrayerRequestDetail
        prayerId={searchParams.get('id') || selectedPrayer?.id}
        onClose={handleBackToList}
        onEdit={handleEditPrayer}
        onDelete={handleDeletePrayer}
      />
    );
  }

  if (viewMode === 'sheet') {
    return (
      <PrayerSheet
        onBack={() => {
          setViewMode('list');
          setSearchParams({});
        }}
      />
    );
  }

  return (
    <div className="prayer-requests-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-top">
            <button 
              className="back-home-btn"
              onClick={() => navigate('/')}
              title="Back to Dashboard"
            >
              🏠 Back Home
            </button>
            <h1 className="page-title">🙏 Prayer Requests</h1>
          </div>
          <p className="page-description">
            Share your prayer needs and support others in their spiritual journey
          </p>
        </div>

        {stats && (
          <div className="prayer-stats">
            <div className="stat-card active-prayers">
              <span className="stat-number">{stats.activePrayerCount}</span>
              <span className="stat-label">Active Prayers</span>
            </div>
            <div className="stat-card answered-prayers">
              <span className="stat-number">{stats.answeredPrayerCount}</span>
              <span className="stat-label">Answered Prayers</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="dismiss-error">×</button>
        </div>
      )}

      {viewMode === 'create' && (
        <div className="form-modal">
          <PrayerRequestForm
            mode="create"
            onSuccess={handleCreateSuccess}
            onCancel={handleBackToList}
          />
        </div>
      )}

      {viewMode === 'edit' && selectedPrayer && (
        <div className="form-modal">
          <PrayerRequestForm
            mode="edit"
            existingPrayer={selectedPrayer}
            onSuccess={handleEditSuccess}
            onCancel={handleBackToList}
          />
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="controls-section">
            <div className="primary-actions">
              {user && (
                <button 
                  className="btn btn-primary create-btn"
                  onClick={() => {
                    setViewMode('create');
                    setSearchParams({ mode: 'create' });
                  }}
                >
                  ✨ Submit Prayer Request
                </button>
              )}
              <button 
                className="btn btn-secondary sheet-btn"
                onClick={() => {
                  setViewMode('sheet');
                  setSearchParams({ mode: 'sheet' });
                }}
                title="View printable prayer sheet with all active prayers"
              >
                📋 Prayer Sheet
              </button>
            </div>

            <div className="filter-controls">
              <div className="search-section">
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder="Search prayers..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="search-input"
                  />
                  <button 
                    onClick={handleSearch}
                    className="search-btn"
                    disabled={!searchText.trim()}
                  >
                    🔍
                  </button>
                </div>
              </div>

              <div className="filter-tabs">
                <button
                  className={`filter-tab ${!activeFilter.myPrayers ? 'active' : ''}`}
                  onClick={() => handleFilterChange('myPrayers', false)}
                >
                  All Prayers
                </button>
                
                {user && (
                  <button
                    className={`filter-tab ${activeFilter.myPrayers ? 'active' : ''}`}
                    onClick={() => handleFilterChange('myPrayers', true)}
                  >
                    My Prayers
                  </button>
                )}
              </div>

              {!activeFilter.myPrayers && (
                <div className="filter-dropdowns">
                  <select
                    value={activeFilter.category || 'all'}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(PRAYER_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={activeFilter.status || 'all'}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Statuses</option>
                    {Object.entries(PRAYER_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {getActiveFilterCount() > 0 && (
                <button 
                  onClick={clearFilters}
                  className="clear-filters-btn"
                  title="Clear all filters"
                >
                  Clear Filters ({getActiveFilterCount()})
                </button>
              )}
            </div>
          </div>

          <div className="prayer-list-container">
            <PrayerRequestList
              onEditPrayer={handleEditPrayer}
              onDeletePrayer={handleDeletePrayer}
              onViewPrayer={handleViewPrayer}
              filter={activeFilter}
              showActions={true}
              compact={false}
            />
          </div>
        </>
      )}

      <style>{`
        .prayer-requests-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .page-header {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-md);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .header-top {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .back-home-btn {
          background: var(--gradient-primary);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: var(--border-radius-md);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          box-shadow: 0 2px 8px var(--button-primary-glow);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .back-home-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--glow-blue);
        }

        .back-home-btn:active {
          transform: translateY(0);
        }

        .header-content h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: 2rem;
          font-weight: 700;
        }

        .page-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1.1rem;
          line-height: 1.4;
        }

        .prayer-stats {
          display: flex;
          gap: 1.5rem;
        }

        .stat-card {
          text-align: center;
          color: #ffffff;
          padding: 1.25rem;
          border-radius: var(--border-radius-md);
          min-width: 120px;
          font-weight: 600;
        }

        .stat-card.active-prayers {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          box-shadow: 0 4px 12px var(--button-primary-glow);
        }

        .stat-card.answered-prayers {
          background: linear-gradient(135deg, var(--success) 0%, var(--accent-tertiary) 100%);
          box-shadow: 0 4px 12px var(--success-glow);
        }

        .stat-card:hover {
          transform: translateY(-2px);
          transition: all var(--transition-base);
        }

        .stat-card.active-prayers:hover {
          box-shadow: var(--glow-blue);
        }

        .stat-card.answered-prayers:hover {
          box-shadow: var(--glow-teal);
        }

        .stat-number {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: #ffffff;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }

        .stat-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #ffffff;
          text-shadow: 0 0 6px rgba(255, 255, 255, 0.2);
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

        .form-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-overlay);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          overflow-y: auto;
        }

        .controls-section {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-md);
        }

        .primary-actions {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .create-btn {
          background: var(--gradient-primary);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: var(--border-radius-pill);
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          box-shadow: 0 4px 12px var(--button-primary-glow);
        }

        .create-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--glow-blue);
        }

        .filter-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-section {
          display: flex;
          justify-content: center;
        }

        .search-input-group {
          display: flex;
          max-width: 400px;
          width: 100%;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-right: none;
          border-radius: var(--border-radius-pill) 0 0 var(--border-radius-pill);
          font-size: 1rem;
          color: var(--text-primary);
          outline: none;
          transition: all var(--transition-base);
        }

        .search-input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
          background: var(--bg-tertiary);
        }

        .search-btn {
          background: var(--accent-primary);
          color: white;
          border: 2px solid var(--accent-primary);
          border-radius: 0 var(--border-radius-pill) var(--border-radius-pill) 0;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: all var(--transition-base);
          box-shadow: 0 2px 8px var(--button-primary-glow);
        }

        .search-btn:hover:not(:disabled) {
          background: var(--accent-primary-dark);
          box-shadow: var(--glow-blue);
        }

        .search-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .filter-tabs {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .filter-tab {
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          padding: 0.75rem 1.5rem;
          border-radius: var(--border-radius-pill);
          cursor: pointer;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-base);
        }

        .filter-tab:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
        }

        .filter-tab.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
          box-shadow: 0 0 12px var(--button-primary-glow);
        }

        .filter-dropdowns {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 0.5rem 1rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.9rem;
          transition: all var(--transition-base);
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
          background: var(--bg-tertiary);
        }

        .clear-filters-btn {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid var(--error);
          color: var(--error);
          padding: 0.5rem 1rem;
          border-radius: var(--border-radius-pill);
          font-size: 0.85rem;
          cursor: pointer;
          align-self: center;
          transition: all var(--transition-base);
        }

        .clear-filters-btn:hover {
          background: var(--error);
          color: white;
          box-shadow: 0 0 12px var(--error-glow);
        }

        .prayer-list-container {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .prayer-requests-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            text-align: center;
            padding: 1.5rem;
          }

          .header-top {
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }

          .back-home-btn {
            align-self: center;
            padding: 0.65rem 1rem;
            font-size: 0.85rem;
          }

          .prayer-stats {
            flex-direction: column;
            width: 100%;
          }

          .stat-card {
            width: 100%;
          }

          .filter-controls {
            gap: 1.5rem;
          }

          .filter-dropdowns {
            flex-direction: column;
            align-items: center;
          }

          .filter-select {
            width: 100%;
            max-width: 250px;
          }

          .search-input-group {
            max-width: none;
          }

          .create-btn {
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default PrayerRequestsPage;