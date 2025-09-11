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

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

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
            <div className="stat-card">
              <span className="stat-number">{stats.activePrayerCount}</span>
              <span className="stat-label">Active Prayers</span>
            </div>
            <div className="stat-card">
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
          background: #f8f9fa;
        }

        .page-header {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
          background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(116, 185, 255, 0.3);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .back-home-btn:hover {
          background: linear-gradient(135deg, #0984e3 0%, #74b9ff 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(116, 185, 255, 0.4);
        }

        .back-home-btn:active {
          transform: translateY(0);
        }

        .header-content h1 {
          margin: 0;
          color: #2c3e50;
          font-size: 2rem;
          font-weight: 700;
        }

        .page-description {
          margin: 0;
          color: #7f8c8d;
          font-size: 1.1rem;
          line-height: 1.4;
        }

        .prayer-stats {
          display: flex;
          gap: 1.5rem;
        }

        .stat-card {
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.25rem;
          border-radius: 12px;
          min-width: 120px;
        }

        .stat-number {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
          font-weight: 500;
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

        .form-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          overflow-y: auto;
        }

        .controls-section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .primary-actions {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .create-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 25px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .create-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
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
          border: 2px solid #e1e8ed;
          border-right: none;
          border-radius: 25px 0 0 25px;
          font-size: 1rem;
          outline: none;
        }

        .search-input:focus {
          border-color: #3498db;
        }

        .search-btn {
          background: #3498db;
          color: white;
          border: 2px solid #3498db;
          border-radius: 0 25px 25px 0;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .search-btn:hover:not(:disabled) {
          background: #2980b9;
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
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          padding: 0.75rem 1.5rem;
          border-radius: 25px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .filter-tab:hover {
          background: #e9ecef;
        }

        .filter-tab.active {
          background: #3498db;
          border-color: #3498db;
          color: white;
        }

        .filter-dropdowns {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 0.5rem 1rem;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3498db;
        }

        .clear-filters-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          cursor: pointer;
          align-self: center;
          transition: background 0.2s ease;
        }

        .clear-filters-btn:hover {
          background: #c0392b;
        }

        .prayer-list-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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