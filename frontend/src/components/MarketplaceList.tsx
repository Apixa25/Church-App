import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeDate } from '../utils/dateUtils';
import {
  MarketplaceListing,
  MarketplaceListingStatus
} from '../services/marketplaceApi';
import './MarketplaceList.css';

interface MarketplaceListProps {
  listings: MarketplaceListing[];
  isLoading: boolean;
  onExpressInterest: (listing: MarketplaceListing) => Promise<void>;
  onMessageSeller: (listing: MarketplaceListing) => Promise<void>;
  onReport: (listing: MarketplaceListing) => Promise<void>;
  onMarkCompleted: (listing: MarketplaceListing) => Promise<void>;
  onDelete: (listing: MarketplaceListing) => Promise<void>;
}

const MarketplaceList: React.FC<MarketplaceListProps> = ({
  listings,
  isLoading,
  onExpressInterest,
  onMessageSeller,
  onReport,
  onMarkCompleted,
  onDelete
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="marketplace-list-state">
        <p>Loading listings...</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="marketplace-list-state">
        <p>No listings found. Try adjusting filters or create the first listing.</p>
      </div>
    );
  }

  const formatMoney = (amount?: number, currency: string = 'USD') => {
    if (amount === undefined || amount === null) {
      return 'No price';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  return (
    <div className="marketplace-grid">
      {listings.map((listing) => {
        const firstImage = listing.imageUrls?.[0];
        const status = listing.status as MarketplaceListingStatus;
        const isAvailable = status === 'ACTIVE' || status === 'RESERVED';
        const isOwner = Boolean(listing.isOwner ?? listing.owner);

        return (
          <article key={listing.id} className="marketplace-card">
            <div className="marketplace-card-media">
              {firstImage ? (
                <img src={firstImage} alt={listing.title} loading="lazy" />
              ) : (
                <div className="marketplace-card-media-placeholder">🧺</div>
              )}
              <span className={`marketplace-status ${status.toLowerCase()}`}>{status}</span>
            </div>

            <div className="marketplace-card-content">
              <div className="marketplace-card-top">
                <h3>{listing.title}</h3>
                <span className="marketplace-section-pill">{listing.sectionType.replace('_', ' ')}</span>
              </div>

              <p className="marketplace-description">
                {listing.description || 'No description provided.'}
              </p>

              <div className="marketplace-meta">
                <span>👤 {listing.ownerName}</span>
                {listing.category && <span>🏷️ {listing.category}</span>}
                {listing.locationLabel && <span>📍 {listing.locationLabel}</span>}
                {listing.distanceMiles !== undefined && listing.distanceMiles !== null && (
                  <span>📏 {listing.distanceMiles.toFixed(1)} mi away</span>
                )}
                <span>⏱️ {formatRelativeDate(listing.createdAt)}</span>
              </div>

              <div className="marketplace-signals">
                <span>💬 {listing.messageCount || 0}</span>
                <span>⭐ {listing.interestCount || 0}</span>
                <span>👀 {listing.viewCount || 0}</span>
                <span>📈 {listing.rankingScore ?? 0}</span>
              </div>

              <div className="marketplace-price-row">
                <strong>
                  {listing.sectionType === 'FOR_SALE'
                    ? formatMoney(listing.priceAmount, listing.currency)
                    : 'Gift Economy Listing'}
                </strong>
                {listing.sectionType !== 'FOR_SALE' && (
                  <span className="marketplace-post-type">{listing.postType}</span>
                )}
              </div>
            </div>

            <div className="marketplace-actions">
              {isOwner ? (
                <>
                  <button onClick={() => onMarkCompleted(listing)} disabled={!isAvailable}>Mark Completed</button>
                  <button onClick={() => onDelete(listing)} className="danger">Remove</button>
                </>
              ) : (
                <>
                  <button onClick={() => onExpressInterest(listing)} disabled={!isAvailable}>I&apos;m Interested</button>
                  <button onClick={() => onMessageSeller(listing)} disabled={!isAvailable}>Message</button>
                  <button onClick={() => onReport(listing)} className="danger-light">Report</button>
                </>
              )}
              <button onClick={() => navigate(`/profile/${listing.ownerUserId}`)}>View Profile</button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default MarketplaceList;
