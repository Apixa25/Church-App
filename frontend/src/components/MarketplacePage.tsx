import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useActiveContext } from '../contexts/ActiveContextContext';
import marketplaceApi, {
  MarketplaceListing,
  MarketplaceListingRequest,
  MarketplaceListingStatus,
  MarketplacePostType,
  MarketplaceSectionType
} from '../services/marketplaceApi';
import MarketplaceList from './MarketplaceList';
import MarketplaceListingForm from './MarketplaceListingForm';
import './MarketplacePage.css';

const sectionTabs: Array<{ id: MarketplaceSectionType; label: string; emoji: string }> = [
  { id: 'DONATION', label: 'Donation', emoji: '🎁' },
  { id: 'SHARING', label: 'Sharing', emoji: '🤝' },
  { id: 'FOR_SALE', label: 'For Sale', emoji: '🏷️' }
];

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useActiveContext();

  const [activeSection, setActiveSection] = useState<MarketplaceSectionType>('SHARING');
  const [postTypeFilter, setPostTypeFilter] = useState<MarketplacePostType | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  const filters = useMemo(() => ({
    organizationId: activeOrganizationId || undefined,
    sectionType: activeSection,
    postType: postTypeFilter === 'ALL' ? undefined : postTypeFilter,
    status: 'ACTIVE' as MarketplaceListingStatus,
    query: query || undefined,
    locationQuery: locationQuery || undefined,
    page,
    size: 18
  }), [activeOrganizationId, activeSection, postTypeFilter, query, locationQuery, page]);

  const listingsQuery = useQuery({
    queryKey: ['marketplace-listings', filters],
    queryFn: () => marketplaceApi.getListings(filters)
  });

  const metricsQuery = useQuery({
    queryKey: ['marketplace-metrics'],
    queryFn: () => marketplaceApi.getMetrics()
  });

  const refreshListings = async () => {
    await queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
    await queryClient.invalidateQueries({ queryKey: ['marketplace-metrics'] });
  };

  const handleCreateListing = async (payload: MarketplaceListingRequest) => {
    await marketplaceApi.createListing(payload);
    setShowCreateForm(false);
    setStatusMessage('Listing published successfully.');
    await refreshListings();
  };

  const handleExpressInterest = async (listing: MarketplaceListing) => {
    try {
      await marketplaceApi.expressInterest(listing.id);
      setStatusMessage('Interest sent. Continue the conversation respectfully.');
      await refreshListings();
    } catch (interestError: any) {
      setError(interestError?.response?.data?.message || 'Could not send interest.');
    }
  };

  const handleMessageSeller = async (listing: MarketplaceListing) => {
    try {
      const result = await marketplaceApi.messageSeller(listing.id);
      setStatusMessage(`Opened chat with ${listing.ownerName}.`);
      navigate(`/chats/${result.chatGroupId}`);
    } catch (messageError: any) {
      setError(messageError?.response?.data?.message || 'Could not open message thread.');
    }
  };

  const handleReportListing = async (listing: MarketplaceListing) => {
    const reason = window.prompt('Report reason (ex: scam_suspected, prohibited_item, harassment):');
    if (!reason) {
      return;
    }

    const description = window.prompt('Optional details for moderators:') || undefined;
    try {
      await marketplaceApi.reportListing(listing.id, reason, description);
      setStatusMessage('Listing reported. Our moderators will review it.');
    } catch (reportError: any) {
      setError(reportError?.response?.data?.message || 'Could not submit report.');
    }
  };

  const handleMarkCompleted = async (listing: MarketplaceListing) => {
    try {
      await marketplaceApi.updateListingStatus(listing.id, 'COMPLETED');
      setStatusMessage('Listing marked as completed.');
      await refreshListings();
    } catch (statusError: any) {
      setError(statusError?.response?.data?.message || 'Could not update listing status.');
    }
  };

  const handleDelete = async (listing: MarketplaceListing) => {
    const confirmed = window.confirm(`Remove "${listing.title}" from marketplace?`);
    if (!confirmed) {
      return;
    }

    try {
      await marketplaceApi.deleteListing(listing.id);
      setStatusMessage('Listing removed.');
      await refreshListings();
    } catch (deleteError: any) {
      setError(deleteError?.response?.data?.message || 'Could not remove listing.');
    }
  };

  return (
    <div className="marketplace-page">
      <header className="marketplace-header">
        <div>
          <h1>🧺 Economy of Giving and Sharing</h1>
          <p>Community-first marketplace with Donation, Sharing, and For Sale sections.</p>
        </div>
        <button className="create-listing-btn" onClick={() => setShowCreateForm(true)}>
          + Create Listing
        </button>
      </header>

      <section className="marketplace-metrics">
        <div className="metric-card"><strong>{metricsQuery.data?.activeListings ?? 0}</strong><span>Active</span></div>
        <div className="metric-card"><strong>{metricsQuery.data?.completedListings ?? 0}</strong><span>Completed</span></div>
        <div className="metric-card"><strong>{metricsQuery.data?.completionRate ?? 0}%</strong><span>Completion Rate</span></div>
        <div className="metric-card"><strong>{metricsQuery.data?.avgInterestPerListing ?? 0}</strong><span>Avg Interest</span></div>
      </section>

      <section className="marketplace-controls">
        <div className="section-tabs">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              className={activeSection === tab.id ? 'active' : ''}
              onClick={() => {
                setActiveSection(tab.id);
                setPage(0);
              }}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        <div className="search-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, descriptions, locations..."
          />
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            placeholder="Location preference"
          />
          <select
            value={postTypeFilter}
            onChange={(e) => setPostTypeFilter(e.target.value as MarketplacePostType | 'ALL')}
          >
            <option value="ALL">All Types</option>
            <option value="GIVE">Give</option>
            <option value="ASK">Ask</option>
          </select>
          <button onClick={() => setPage(0)}>Apply</button>
        </div>
      </section>

      {statusMessage && (
        <div className="marketplace-banner success">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')}>✕</button>
        </div>
      )}
      {error && (
        <div className="marketplace-banner error">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <MarketplaceList
        listings={listingsQuery.data?.content || []}
        isLoading={listingsQuery.isLoading}
        onExpressInterest={handleExpressInterest}
        onMessageSeller={handleMessageSeller}
        onReport={handleReportListing}
        onMarkCompleted={handleMarkCompleted}
        onDelete={handleDelete}
      />

      <div className="marketplace-pagination">
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</button>
        <span>Page {(listingsQuery.data?.number ?? page) + 1} of {Math.max(1, listingsQuery.data?.totalPages ?? 1)}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={listingsQuery.data ? page >= listingsQuery.data.totalPages - 1 : false}
        >
          Next
        </button>
      </div>

      {showCreateForm && (
        <div className="marketplace-modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="marketplace-modal-content" onClick={(event) => event.stopPropagation()}>
            <MarketplaceListingForm
              onSave={handleCreateListing}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
