import React, { useEffect, useMemo, useState } from 'react';
import MediaUploader from './MediaUploader';
import { MediaFile } from '../types/Post';
import { uploadMediaDirect } from '../services/postApi';
import {
  MarketplaceListing,
  MarketplaceListingRequest,
  MarketplacePostType,
  MarketplaceSectionType
} from '../services/marketplaceApi';
import { useAuth } from '../contexts/AuthContext';
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

const categoryOptions = [
  'Furniture',
  'Electronics',
  'Home & Garden',
  'Clothing & Shoes',
  'Baby & Kids',
  'Sports & Outdoors',
  'Automotive',
  'Tools & Hardware',
  'Health & Beauty',
  'Pet Supplies',
  'Books & Media',
  'Toys & Games',
  'Office Supplies',
  'Appliances',
  'Jewelry & Accessories',
  'Musical Instruments',
  'Collectibles',
  'Other'
];

const conditionOptions = ['New', 'Good', 'Fair', 'Needs Repair'];

const RADIUS_MILES_OPTIONS = [5, 10, 15, 25, 50];
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

const MarketplaceListingForm: React.FC<MarketplaceListingFormProps> = ({
  initialValue,
  onSave,
  onCancel
}) => {
  const { user } = useAuth();
  const { activeOrganizationId } = useActiveContext();
  const profileLocationLabel = useMemo(() => {
    if (user?.location) return user.location;
    const cityState = [user?.city, user?.stateProvince].filter(Boolean).join(', ');
    return cityState || '';
  }, [user?.city, user?.location, user?.stateProvince]);

  const initialRadiusMiles = useMemo(() => {
    if (!initialValue?.distanceRadiusKm) return '10';
    const miles = Math.max(1, Math.round(initialValue.distanceRadiusKm / 1.60934));
    return String(miles);
  }, [initialValue?.distanceRadiusKm]);

  const [sectionType, setSectionType] = useState<MarketplaceSectionType>(initialValue?.sectionType || 'SHARING');
  const [postType, setPostType] = useState<MarketplacePostType>(initialValue?.postType || 'GIVE');
  const [title, setTitle] = useState(initialValue?.title || '');
  const [description, setDescription] = useState(initialValue?.description || '');
  const [category, setCategory] = useState(initialValue?.category || '');
  const [itemCondition, setItemCondition] = useState(initialValue?.itemCondition || '');
  const [priceAmount, setPriceAmount] = useState(initialValue?.priceAmount?.toString() || '');
  const [locationLabel, setLocationLabel] = useState(initialValue?.locationLabel || profileLocationLabel);
  const [distanceRadiusMiles, setDistanceRadiusMiles] = useState(initialRadiusMiles);
  const [latitude, setLatitude] = useState<number | undefined>(initialValue?.latitude ?? user?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialValue?.longitude ?? user?.longitude);
  const [locationSource, setLocationSource] = useState<string>(
    initialValue?.locationSource || (user?.latitude != null && user?.longitude != null ? 'PROFILE_DEFAULT' : 'MANUAL')
  );
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isForSale = sectionType === 'FOR_SALE';
  const titleLimitRemaining = useMemo(() => Math.max(0, 140 - title.length), [title.length]);

  useEffect(() => {
    if (initialValue) return;
    if (!locationLabel && profileLocationLabel) {
      setLocationLabel(profileLocationLabel);
    }
    if (latitude == null && user?.latitude != null) {
      setLatitude(user.latitude);
    }
    if (longitude == null && user?.longitude != null) {
      setLongitude(user.longitude);
    }
  }, [initialValue, latitude, locationLabel, longitude, profileLocationLabel, user?.latitude, user?.longitude]);

  const handleUseProfileLocation = () => {
    if (!user) {
      setError('Please sign in to use profile location defaults.');
      return;
    }

    const fallbackLabel = profileLocationLabel || locationLabel;
    setLocationLabel(fallbackLabel);
    setLatitude(user.latitude);
    setLongitude(user.longitude);
    setLocationSource('PROFILE_DEFAULT');
    setError('');
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationSource('BROWSER_GPS');
      },
      (geoError) => {
        setError(`Unable to capture your location: ${geoError.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('[MarketplaceListingForm] submit:start', {
      sectionType,
      postType,
      title,
      hasDescription: Boolean(description.trim()),
      category,
      locationLabel,
      distanceRadiusMiles,
      latitude,
      longitude,
      locationSource,
      mediaCount: mediaFiles.length,
      activeOrganizationId
    });

    if (!title.trim()) {
      setError('Title is required.');
      console.warn('[MarketplaceListingForm] submit:blocked - empty title');
      return;
    }

    if (!category.trim()) {
      setError('Please choose a category.');
      console.warn('[MarketplaceListingForm] submit:blocked - missing category');
      return;
    }

    if (!itemCondition.trim()) {
      setError('Please choose an item condition.');
      console.warn('[MarketplaceListingForm] submit:blocked - missing condition');
      return;
    }

    const trimmedLocationLabel = locationLabel.trim();
    const hasCoordinates = latitude != null && longitude != null;
    const hasValidCoordinates = hasCoordinates
      && latitude >= MIN_LATITUDE
      && latitude <= MAX_LATITUDE
      && longitude >= MIN_LONGITUDE
      && longitude <= MAX_LONGITUDE;

    if (!trimmedLocationLabel || !hasValidCoordinates) {
      setError('A valid location is required. Use Profile Location or Use Current GPS before publishing.');
      console.warn('[MarketplaceListingForm] submit:blocked - invalid location payload', {
        locationLabel: trimmedLocationLabel,
        latitude,
        longitude
      });
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
        locationLabel: trimmedLocationLabel,
        distanceRadiusKm: distanceRadiusMiles ? Math.round(Number(distanceRadiusMiles) * 1.60934) : undefined,
        latitude,
        longitude,
        locationSource,
        geocodeStatus: 'COORDINATES_CAPTURED',
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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          Condition
          <select
            value={itemCondition}
            onChange={(e) => setItemCondition(e.target.value)}
          >
            <option value="">Select condition</option>
            {conditionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <input
            type="text"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="General area only (no exact address)"
          />
          <small>
            {latitude != null && longitude != null
              ? `Coordinates attached (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
              : 'No coordinates attached yet'}
          </small>
          <div className="marketplace-location-actions">
            <button type="button" className="marketplace-location-btn" onClick={handleUseProfileLocation}>
              Use Profile Location
            </button>
            <button type="button" className="marketplace-location-btn" onClick={handleUseCurrentLocation}>
              Use Current GPS
            </button>
          </div>
        </label>

        <label>
          Radius (miles)
          <select
            value={distanceRadiusMiles}
            onChange={(e) => setDistanceRadiusMiles(e.target.value)}
          >
            {RADIUS_MILES_OPTIONS.map((miles) => (
              <option key={miles} value={String(miles)}>
                {miles} miles
              </option>
            ))}
          </select>
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
