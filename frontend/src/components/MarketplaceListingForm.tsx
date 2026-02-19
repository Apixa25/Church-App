import React, { useMemo, useState } from 'react';
import MediaUploader from './MediaUploader';
import { MediaFile } from '../types/Post';
import { uploadMediaDirect } from '../services/postApi';
import {
  MarketplaceListing,
  MarketplaceListingRequest,
  MarketplacePostType,
  MarketplaceSectionType
} from '../services/marketplaceApi';
import { useActiveContext } from '../contexts/ActiveContextContext';
import './MarketplaceListingForm.css';

interface MarketplaceListingFormProps {
  initialValue?: MarketplaceListing | null;
  onSave: (payload: MarketplaceListingRequest) => Promise<void>;
  onCancel: () => void;
}

const sectionOptions: Array<{ value: MarketplaceSectionType; label: string }> = [
  { value: 'DONATION', label: 'Donation' },
  { value: 'SHARING', label: 'Sharing' },
  { value: 'FOR_SALE', label: 'For Sale' }
];

const postTypeOptions: Array<{ value: MarketplacePostType; label: string }> = [
  { value: 'GIVE', label: 'Give' },
  { value: 'ASK', label: 'Ask' }
];

const MarketplaceListingForm: React.FC<MarketplaceListingFormProps> = ({
  initialValue,
  onSave,
  onCancel
}) => {
  const { activeOrganizationId } = useActiveContext();
  const [sectionType, setSectionType] = useState<MarketplaceSectionType>(initialValue?.sectionType || 'SHARING');
  const [postType, setPostType] = useState<MarketplacePostType>(initialValue?.postType || 'GIVE');
  const [title, setTitle] = useState(initialValue?.title || '');
  const [description, setDescription] = useState(initialValue?.description || '');
  const [category, setCategory] = useState(initialValue?.category || '');
  const [itemCondition, setItemCondition] = useState(initialValue?.itemCondition || '');
  const [priceAmount, setPriceAmount] = useState(initialValue?.priceAmount?.toString() || '');
  const [locationLabel, setLocationLabel] = useState(initialValue?.locationLabel || '');
  const [distanceRadiusKm, setDistanceRadiusKm] = useState(initialValue?.distanceRadiusKm?.toString() || '');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isForSale = sectionType === 'FOR_SALE';
  const titleLimitRemaining = useMemo(() => Math.max(0, 140 - title.length), [title.length]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('[MarketplaceListingForm] submit:start', {
      sectionType,
      postType,
      title,
      hasDescription: Boolean(description.trim()),
      category,
      locationLabel,
      mediaCount: mediaFiles.length,
      activeOrganizationId
    });

    if (!title.trim()) {
      setError('Title is required.');
      console.warn('[MarketplaceListingForm] submit:blocked - empty title');
      return;
    }

    if (isForSale) {
      const numericPrice = Number(priceAmount);
      if (!priceAmount || Number.isNaN(numericPrice) || numericPrice <= 0) {
        setError('For Sale listings require a valid price greater than 0.');
        console.warn('[MarketplaceListingForm] submit:blocked - invalid for sale price', { priceAmount });
        return;
      }
    }

    try {
      setError('');
      setIsSaving(true);

      let uploadedImageUrls = initialValue?.imageUrls || [];
      if (mediaFiles.length > 0) {
        console.log('[MarketplaceListingForm] submit:upload:start', { mediaCount: mediaFiles.length });
        uploadedImageUrls = await uploadMediaDirect(
          mediaFiles.map((media) => media.file),
          'marketplace'
        );
        console.log('[MarketplaceListingForm] submit:upload:success', { uploadedCount: uploadedImageUrls.length });
      }

      const payload: MarketplaceListingRequest = {
        sectionType,
        // For sale listings should not expose Give/Ask semantics.
        postType: isForSale ? 'GIVE' : postType,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        itemCondition: itemCondition.trim() || undefined,
        priceAmount: isForSale ? Number(priceAmount) : undefined,
        currency: isForSale ? 'USD' : undefined,
        locationLabel: locationLabel.trim() || undefined,
        distanceRadiusKm: distanceRadiusKm ? Number(distanceRadiusKm) : undefined,
        imageUrls: uploadedImageUrls,
        organizationId: activeOrganizationId || undefined
      };

      console.log('[MarketplaceListingForm] submit:onSave:start', payload);
      await onSave(payload);
      console.log('[MarketplaceListingForm] submit:onSave:success');
    } catch (submitError: any) {
      console.error('Failed to save marketplace listing:', submitError);
      setError(submitError?.response?.data?.message || submitError?.message || 'Failed to save listing');
    } finally {
      setIsSaving(false);
      console.log('[MarketplaceListingForm] submit:complete');
    }
  };

  return (
    <form className="marketplace-form" onSubmit={handleSubmit}>
      <div className="marketplace-form-header">
        <h3>{initialValue ? 'Edit Listing' : 'Create Marketplace Listing'}</h3>
        <p>Build a culture of giving, sharing, and fair selling.</p>
      </div>

      {error && <div className="marketplace-form-error">⚠️ {error}</div>}

      <div className="marketplace-form-grid">
        <label>
          Section
          <select value={sectionType} onChange={(e) => setSectionType(e.target.value as MarketplaceSectionType)}>
            {sectionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {!isForSale && (
          <label>
            Post Type
            <select value={postType} onChange={(e) => setPostType(e.target.value as MarketplacePostType)}>
              {postTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="marketplace-form-full">
          Title
          <input
            type="text"
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you offering or asking for?"
          />
          <small>{titleLimitRemaining} characters remaining</small>
        </label>

        <label className="marketplace-form-full">
          Description
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share details, pickup notes, and what would bless someone."
          />
        </label>

        <label>
          Category
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Example: Furniture, Childcare, Tools"
          />
        </label>

        <label>
          Condition
          <input
            type="text"
            value={itemCondition}
            onChange={(e) => setItemCondition(e.target.value)}
            placeholder="New, Good, Fair, Needs Repair"
          />
        </label>

        <label>
          Location
          <input
            type="text"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="General area only (no exact address)"
          />
        </label>

        <label>
          Radius (km)
          <input
            type="number"
            min={1}
            value={distanceRadiusKm}
            onChange={(e) => setDistanceRadiusKm(e.target.value)}
            placeholder="10"
          />
        </label>

        <label>
          Price (USD)
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceAmount}
            disabled={!isForSale}
            onChange={(e) => setPriceAmount(e.target.value)}
            placeholder={isForSale ? '0.00' : 'Only available in For Sale section'}
          />
        </label>
      </div>

      <div className="marketplace-media-block">
        <MediaUploader
          onFilesSelected={setMediaFiles}
          maxFiles={6}
          maxFileSize={20}
          acceptedTypes={['image/*']}
          multiple={true}
        />
      </div>

      <div className="marketplace-form-actions">
        <button type="button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={isSaving}>
          {isSaving ? 'Saving...' : initialValue ? 'Update Listing' : 'Publish Listing'}
        </button>
      </div>
    </form>
  );
};

export default MarketplaceListingForm;
