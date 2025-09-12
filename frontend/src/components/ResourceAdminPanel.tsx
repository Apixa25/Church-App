import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resourceAPI } from '../services/resourceApi';
import { Resource, ResourceStats, getResourceCategoryLabel, formatFileSize, getFileIconByType } from '../types/Resource';
import './ResourceAdminPanel.css';

interface ResourceAdminPanelProps {
  onBack: () => void;
  onError: (error: string) => void;
}

const ResourceAdminPanel: React.FC<ResourceAdminPanelProps> = ({
  onBack,
  onError,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'stats'>('pending');
  const [pendingResources, setPendingResources] = useState<Resource[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const pageSize = 10;
  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingResources();
    } else if (activeTab === 'all') {
      loadAllResources();
    } else if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab, currentPage, searchTerm]);

  const loadPendingResources = async () => {
    try {
      setLoading(true);
      const response = await resourceAPI.getPendingResources(currentPage, pageSize);
      setPendingResources(response.data.resources);
      setTotalPages(response.data.totalPages);
    } catch (error: any) {
      console.error('Error loading pending resources:', error);
      onError(error.response?.data?.error || 'Failed to load pending resources');
    } finally {
      setLoading(false);
    }
  };

  const loadAllResources = async () => {
    try {
      setLoading(true);
      const response = await resourceAPI.getAllResources(currentPage, pageSize, searchTerm || undefined);
      setAllResources(response.data.resources);
      setTotalPages(response.data.totalPages);
    } catch (error: any) {
      console.error('Error loading all resources:', error);
      onError(error.response?.data?.error || 'Failed to load all resources');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await resourceAPI.getResourceStats();
      setStats(response.data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      onError(error.response?.data?.error || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (resourceId: string) => {
    try {
      await resourceAPI.approveResource(resourceId);
      if (activeTab === 'pending') {
        loadPendingResources();
      } else {
        loadAllResources();
      }
      loadStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error approving resource:', error);
      onError(error.response?.data?.error || 'Failed to approve resource');
    }
  };

  const handleReject = async (resourceId: string) => {
    try {
      await resourceAPI.rejectResource(resourceId);
      if (activeTab === 'pending') {
        loadPendingResources();
      } else {
        loadAllResources();
      }
      loadStats(); // Refresh stats
    } catch (error: any) {
      console.error('Error rejecting resource:', error);
      onError(error.response?.data?.error || 'Failed to reject resource');
    }
  };

  const handleTabChange = (tab: 'pending' | 'all' | 'stats') => {
    setActiveTab(tab);
    setCurrentPage(0);
    setSearchTerm('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderResourceCard = (resource: Resource) => (
    <div key={resource.id} className="admin-resource-card">
      <div className="admin-resource-header">
        <div className="admin-resource-info">
          <div className="admin-resource-icon">
            {getFileIconByType(resource.fileType)}
          </div>
          <div className="admin-resource-details">
            <h4 className="admin-resource-title">{resource.title}</h4>
            <p className="admin-resource-category">
              {getResourceCategoryLabel(resource.category)}
            </p>
            <div className="admin-resource-meta">
              <span>By {resource.uploaderName}</span>
              <span>{formatDate(resource.createdAt)}</span>
              {resource.fileSize && (
                <span>{formatFileSize(resource.fileSize)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="admin-resource-status">
          <span className={`status-badge ${resource.isApproved ? 'approved' : 'pending'}`}>
            {resource.isApproved ? '✅ Approved' : '⏳ Pending'}
          </span>
          <span className="download-count">
            ↓ {resource.downloadCount}
          </span>
        </div>
      </div>

      {resource.description && (
        <div className="admin-resource-description">
          <p>{resource.description}</p>
        </div>
      )}

      <div className="admin-resource-actions">
        {resource.fileUrl && (
          <a
            href={resource.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-primary"
          >
            👁️ View File
          </a>
        )}
        
        {!resource.isApproved && (
          <>
            <button
              className="btn btn-sm btn-success"
              onClick={() => handleApprove(resource.id)}
            >
              ✅ Approve
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => handleReject(resource.id)}
            >
              ❌ Reject
            </button>
          </>
        )}
        
        {resource.isApproved && (
          <button
            className="btn btn-sm btn-warning"
            onClick={() => handleReject(resource.id)}
          >
            🔒 Revoke
          </button>
        )}
      </div>
    </div>
  );

  const renderPendingTab = () => (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <h3>📋 Pending Approval ({pendingResources.length})</h3>
        <p>Resources waiting for admin approval</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading pending resources...</p>
        </div>
      ) : pendingResources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h4>No pending resources!</h4>
          <p>All resources have been reviewed.</p>
        </div>
      ) : (
        <div className="admin-resources-list">
          {pendingResources.map(renderResourceCard)}
        </div>
      )}
    </div>
  );

  const renderAllTab = () => (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <h3>📚 All Resources ({allResources.length})</h3>
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search all resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading all resources...</p>
        </div>
      ) : allResources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h4>No resources found</h4>
          <p>Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="admin-resources-list">
          {allResources.map(renderResourceCard)}
        </div>
      )}
    </div>
  );

  const renderStatsTab = () => (
    <div className="admin-tab-content">
      <div className="admin-tab-header">
        <h3>📊 Statistics Overview</h3>
        <p>Resource library analytics</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading statistics...</p>
        </div>
      ) : stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalApproved}</div>
              <div className="stat-label">Approved Resources</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalPending}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-number">{stats.recentCount}</div>
              <div className="stat-label">Added This Week</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalApproved + stats.totalPending}</div>
              <div className="stat-label">Total Resources</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>No statistics available</h4>
          <p>Statistics could not be loaded.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="resource-admin-panel">
      <div className="admin-panel-header">
        <div className="admin-panel-title">
          <h2>🛡️ Resource Administration</h2>
          <p>Manage resources, moderate content, and view analytics</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>
          ⬅️ Back to Resources
        </button>
      </div>

      <div className="admin-panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => handleTabChange('pending')}
        >
          📋 Pending ({stats?.totalPending || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          📚 All Resources
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => handleTabChange('stats')}
        >
          📊 Statistics
        </button>
      </div>

      <div className="admin-panel-content">
        {activeTab === 'pending' && renderPendingTab()}
        {activeTab === 'all' && renderAllTab()}
        {activeTab === 'stats' && renderStatsTab()}
      </div>

      {/* Pagination */}
      {(activeTab === 'pending' || activeTab === 'all') && totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
          >
            ⏮️
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            ⏪
          </button>
          
          <span className="pagination-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            ⏩
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
          >
            ⏭️
          </button>
        </div>
      )}
    </div>
  );
};

export default ResourceAdminPanel;