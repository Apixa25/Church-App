import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/Post';
import { UserProfile } from '../types/Profile';
import { updateUserProfile, uploadProfilePicture, uploadBannerImage } from '../services/postApi';
import './ProfileEdit.css';

const SPIRITUAL_GIFTS = [
  'Prophecy',
  'Teaching',
  'Message of Wisdom',
  'Message of Knowledge',
  'Faith',
  'Gifts of Healing',
  'Miraculous Powers / Miracles',
  'Discernment of Spirits',
  'Tongues',
  'Interpretation of Tongues',
  'Serving / Helps',
  'Encouragement / Exhortation',
  'Giving',
  'Leadership / Administration',
  'Mercy'
] as const;

const EQUIPPING_GIFTS = [
  'Apostle',
  'Prophet',
  'Evangelist',
  'Pastor',
  'Teacher'
] as const;

interface ProfileFormData {
  name: string;
  bio: string;
  location: string;
  website: string;
  interests: string[];
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  geocodeStatus: string;
  birthday: string;
  spiritualGifts: string[];
  equippingGifts: string[];
}

interface ProfileEditProps {
  profile?: UserProfile;
  onProfileUpdate?: (updatedProfile: UserProfile) => void;
  onCancel?: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ 
  profile: externalProfile, 
  onProfileUpdate, 
  onCancel 
}) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    bio: '',
    location: '',
    website: '',
    interests: [],
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'United States',
    latitude: '',
    longitude: '',
    geocodeStatus: '',
    birthday: '',
    spiritualGifts: [],
    equippingGifts: []
  });

  const [isLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string>('');
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string>('');
  const [newInterest, setNewInterest] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Load current user data or external profile
  useEffect(() => {
    const profileToUse = externalProfile || user;
    if (profileToUse) {
      setFormData({
        name: profileToUse.name || '',
        bio: profileToUse.bio || '',
        location: (profileToUse as User).location || profileToUse.location || '',
        website: (profileToUse as User).website || profileToUse.website || '',
        interests: (() => {
          try {
            const interestsData = (profileToUse as User).interests || profileToUse.interests;
            if (typeof interestsData === 'string') {
              return JSON.parse(interestsData);
            }
            return Array.isArray(interestsData) ? interestsData : [];
          } catch (e) {
            return [];
          }
        })(),
        phoneNumber: profileToUse.phoneNumber || '',
        addressLine1: profileToUse.addressLine1 || '',
        addressLine2: profileToUse.addressLine2 || '',
        city: profileToUse.city || '',
        stateProvince: profileToUse.stateProvince || '',
        postalCode: profileToUse.postalCode || '',
        country: profileToUse.country || 'United States',
        latitude: profileToUse.latitude !== undefined && profileToUse.latitude !== null
          ? String(profileToUse.latitude)
          : '',
        longitude: profileToUse.longitude !== undefined && profileToUse.longitude !== null
          ? String(profileToUse.longitude)
          : '',
        geocodeStatus: profileToUse.geocodeStatus || '',
        birthday: profileToUse.birthday || '',
        spiritualGifts: profileToUse.spiritualGift
          ? profileToUse.spiritualGift
              .split(',')
              .map(gift => gift.trim())
              .filter(Boolean)
          : [],
        equippingGifts: profileToUse.equippingGifts
          ? profileToUse.equippingGifts
              .split(',')
              .map(gift => gift.trim())
              .filter(Boolean)
          : []
      });

      if (profileToUse.profilePicUrl) {
        setProfilePicPreview(profileToUse.profilePicUrl);
      }
      if ((profileToUse as any).bannerImageUrl) {
        setBannerImagePreview((profileToUse as any).bannerImageUrl);
      }
    }
  }, [user, externalProfile]);

  const handleInputChange = (field: keyof ProfileFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }

      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Banner image file size must be less than 5MB');
        return;
      }

      setBannerImageFile(file);
      setBannerImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleAddInterest = () => {
    const trimmedInterest = newInterest.trim();
    if (trimmedInterest && !formData.interests.includes(trimmedInterest)) {
      if (formData.interests.length >= 10) {
        setError('You can add up to 10 interests');
        return;
      }

      handleInputChange('interests', [...formData.interests, trimmedInterest]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    handleInputChange('interests', formData.interests.filter(i => i !== interestToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInterest();
    }
  };

  const toggleSpiritualGift = (gift: (typeof SPIRITUAL_GIFTS)[number]) => {
    setFormData(prev => {
      const isSelected = prev.spiritualGifts.includes(gift);
      const updatedGifts = isSelected
        ? prev.spiritualGifts.filter(item => item !== gift)
        : [...prev.spiritualGifts, gift];

      return {
        ...prev,
        spiritualGifts: updatedGifts
      };
    });
    setError('');
    setSuccess('');
  };

  const isSpiritualGiftSelected = (gift: (typeof SPIRITUAL_GIFTS)[number]) =>
    formData.spiritualGifts.includes(gift);

  const toggleEquippingGift = (gift: (typeof EQUIPPING_GIFTS)[number]) => {
    setFormData(prev => {
      const isSelected = prev.equippingGifts.includes(gift);
      const updatedGifts = isSelected
        ? prev.equippingGifts.filter(item => item !== gift)
        : [...prev.equippingGifts, gift];

      return {
        ...prev,
        equippingGifts: updatedGifts
      };
    });
    setError('');
    setSuccess('');
  };

  const isEquippingGiftSelected = (gift: (typeof EQUIPPING_GIFTS)[number]) =>
    formData.equippingGifts.includes(gift);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (formData.name.length > 50) {
      setError('Name must be less than 50 characters');
      return false;
    }

    if (formData.bio && formData.bio.length > 200) {
      setError('Bio must be less than 200 characters');
      return false;
    }

    if (formData.website && !isValidUrl(formData.website)) {
      setError('Please enter a valid website URL');
      return false;
    }

    if (!formData.addressLine1.trim()) {
      setError('Address line 1 is required');
      return false;
    }

    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }

    if (!formData.stateProvince.trim()) {
      setError('State or province is required');
      return false;
    }

    if (!formData.postalCode.trim()) {
      setError('Postal code is required');
      return false;
    }

    if (!formData.country.trim()) {
      setError('Country is required');
      return false;
    }

    if (formData.latitude.trim() && isNaN(Number(formData.latitude.trim()))) {
      setError('Latitude must be a valid number');
      return false;
    }

    if (formData.longitude.trim() && isNaN(Number(formData.longitude.trim()))) {
      setError('Longitude must be a valid number');
      return false;
    }

    return true;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Upload profile picture if changed
      let profilePicUrl = user.profilePicUrl;
      if (profilePicFile) {
        const uploadResult = await uploadProfilePicture(profilePicFile);
        profilePicUrl = uploadResult;
      }

      // Upload banner image if changed
      let bannerImageUrl = (user as any).bannerImageUrl || (externalProfile as any)?.bannerImageUrl;
      if (bannerImageFile) {
        try {
          const uploadResult = await uploadBannerImage(bannerImageFile);
          bannerImageUrl = uploadResult;
        } catch (bannerErr: any) {
          // If banner upload endpoint doesn't exist yet, use profile picture endpoint as fallback
          console.warn('Banner upload endpoint not available, using profile picture endpoint:', bannerErr);
          const uploadResult = await uploadProfilePicture(bannerImageFile);
          bannerImageUrl = uploadResult;
        }
      }

      // Prepare profile data with serialization for backend expectations
      const {
        spiritualGifts,
        equippingGifts,
        interests,
        latitude,
        longitude,
        geocodeStatus,
        ...restFormData
      } = formData;

      const latitudeValue = latitude.trim() ? Number(latitude.trim()) : null;
      const longitudeValue = longitude.trim() ? Number(longitude.trim()) : null;

      const updatedProfile = {
        ...restFormData,
        name: restFormData.name.trim(),
        bio: restFormData.bio.trim(),
        location: restFormData.location.trim(),
        website: restFormData.website.trim(),
        phoneNumber: restFormData.phoneNumber.trim(),
        addressLine1: restFormData.addressLine1.trim(),
        addressLine2: restFormData.addressLine2.trim(),
        city: restFormData.city.trim(),
        stateProvince: restFormData.stateProvince.trim(),
        postalCode: restFormData.postalCode.trim(),
        country: restFormData.country.trim() || 'United States',
        spiritualGift: spiritualGifts.join(', '),
        equippingGifts: equippingGifts.join(', '),
        profilePicUrl,
        bannerImageUrl,
        interests: JSON.stringify(interests), // Convert array to JSON string for backend
        latitude: latitudeValue,
        longitude: longitudeValue,
        geocodeStatus: geocodeStatus.trim()
      };

      const result = await updateUserProfile(user!.userId, updatedProfile);

      // Update local user state
      if (updateUser) {
        updateUser(result);
      }

      // Call external callback if provided
      if (onProfileUpdate && externalProfile) {
        const updatedUserProfile: UserProfile = {
          userId: externalProfile.userId,
          email: externalProfile.email,
          name: result.name,
          bio: result.bio,
          location: result.location,
          website: result.website,
          interests: result.interests,
          phoneNumber: result.phoneNumber,
          addressLine1: result.addressLine1,
          addressLine2: result.addressLine2,
          city: result.city,
          stateProvince: result.stateProvince,
          postalCode: result.postalCode,
          country: result.country,
          latitude: result.latitude !== undefined && result.latitude !== null ? result.latitude : null,
          longitude: result.longitude !== undefined && result.longitude !== null ? result.longitude : null,
          geocodeStatus: result.geocodeStatus || null,
          birthday: result.birthday,
          spiritualGift: result.spiritualGift,
          equippingGifts: result.equippingGifts,
          role: externalProfile.role,
          profilePicUrl: result.profilePicUrl,
          bannerImageUrl: (result as any).bannerImageUrl || bannerImageUrl,
          createdAt: externalProfile.createdAt,
          updatedAt: new Date().toISOString(),
          lastLogin: externalProfile.lastLogin
        };
        onProfileUpdate(updatedUserProfile);
        if (onCancel) onCancel();
        return;
      }

      setSuccess('Profile updated successfully!');

      // Navigate back to profile after a short delay
      setTimeout(() => {
        navigate(`/profile/${user.id}`);
      }, 2000);

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(`/profile/${user?.id}`);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicFile(null);
    setProfilePicPreview('');
  };

  const removeBannerImage = () => {
    setBannerImageFile(null);
    setBannerImagePreview('');
  };

  if (isLoading) {
    return (
      <div className="profile-edit loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-edit">
      <div className="edit-container">
        {/* Header */}
        <div className="edit-header">
          <h1>Edit Profile</h1>
          <p>Update your church community profile</p>
        </div>

        {/* Banner Image Section */}
        <div className="edit-section">
          <h2>Banner Image</h2>
          <p className="section-desc">
            Upload a banner image that appears at the top of your profile (like X.com)
          </p>
          <div className="banner-section">
            <div className="banner-preview-container">
              {bannerImagePreview ? (
                <img
                  src={bannerImagePreview}
                  alt="Banner preview"
                  className="banner-preview"
                />
              ) : (
                <div className="banner-placeholder-edit">
                  <span className="banner-placeholder-icon">🖼️</span>
                  <span className="banner-placeholder-text">No banner image</span>
                </div>
              )}
            </div>

            <div className="banner-actions">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerImageChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="banner-btn upload"
              >
                📷 {bannerImagePreview ? 'Change Banner' : 'Upload Banner'}
              </button>

              {bannerImagePreview && (
                <button
                  type="button"
                  onClick={removeBannerImage}
                  className="banner-btn remove"
                >
                  🗑️ Remove
                </button>
              )}
            </div>
          </div>

          <div className="banner-help">
            <small>Upload a wide image (JPG, PNG) up to 5MB. Recommended size: 1500x500px</small>
          </div>
        </div>

        {/* Profile Picture Section */}
        <div className="edit-section">
          <h2>Profile Picture</h2>
          <div className="profile-pic-section">
            <div className="current-pic">
              {profilePicPreview ? (
                <img
                  src={profilePicPreview}
                  alt="Profile preview"
                  className="pic-preview"
                />
              ) : (
                <div className="pic-placeholder">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="pic-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="pic-btn upload"
              >
                📷 Upload Photo
              </button>

              {profilePicPreview && (
                <button
                  type="button"
                  onClick={removeProfilePicture}
                  className="pic-btn remove"
                >
                  🗑️ Remove
                </button>
              )}
            </div>
          </div>

          <div className="pic-help">
            <small>Upload a square image (JPG, PNG) up to 5MB for best results</small>
          </div>
        </div>

        {/* Basic Information */}
        <div className="edit-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              maxLength={50}
              className="form-input"
            />
            <small className="char-count">{formData.name.length}/50</small>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell the community about yourself, your faith journey, or your interests..."
              maxLength={200}
              rows={4}
              className="form-textarea"
            />
            <small className="char-count">{formData.bio.length}/200</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State/Country"
                maxLength={100}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://your-website.com"
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Contact & Personal Information */}
        <div className="edit-section">
          <h2>Contact & Personal Information</h2>
          <p className="section-desc">
            Optional information to help others connect with you
          </p>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="(555) 123-4567"
                maxLength={20}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="birthday">Birthday</label>
              <input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => handleInputChange('birthday', e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="addressLine1">Address Line 1 *</label>
              <input
                id="addressLine1"
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                placeholder="123 Church Street"
                maxLength={255}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="addressLine2">Address Line 2</label>
              <input
                id="addressLine2"
                type="text"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                placeholder="Apartment, suite, etc."
                maxLength={255}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
                maxLength={100}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="stateProvince">State / Province *</label>
              <input
                id="stateProvince"
                type="text"
                value={formData.stateProvince}
                onChange={(e) => handleInputChange('stateProvince', e.target.value)}
                placeholder="State or province"
                maxLength={100}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="postalCode">Postal Code *</label>
              <input
                id="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder="ZIP or postal code"
                maxLength={20}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="country">Country *</label>
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Country"
                maxLength={100}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="latitude">Latitude</label>
              <input
                id="latitude"
                type="text"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value)}
                placeholder="Optional latitude (e.g., 37.7749)"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="longitude">Longitude</label>
              <input
                id="longitude"
                type="text"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value)}
                placeholder="Optional longitude (e.g., -122.4194)"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="geocodeStatus">Geocode Status</label>
            <input
              id="geocodeStatus"
              type="text"
              value={formData.geocodeStatus}
              onChange={(e) => handleInputChange('geocodeStatus', e.target.value)}
              placeholder="Optional geocode status notes"
              maxLength={50}
              className="form-input"
            />
          </div>

          <div className="form-group spiritual-gifts-group" role="group" aria-label="Spiritual gifts selection">
            <label className="spiritual-gifts-label">Spiritual Gifts</label>
            <p className="field-help">
              Tap the gifts that resonate with how you serve. Select as many as you’d like!
            </p>
            <div className="spiritual-gifts-grid">
              {SPIRITUAL_GIFTS.map(gift => {
                const selected = isSpiritualGiftSelected(gift);
                return (
                  <button
                    type="button"
                    key={gift}
                    className={`spiritual-gift-option ${selected ? 'selected' : ''}`}
                    onClick={() => toggleSpiritualGift(gift)}
                    aria-pressed={selected}
                  >
                    {gift}
                  </button>
                );
              })}
            </div>
            {formData.spiritualGifts.length > 0 && (
              <div className="selected-gifts-summary">
                <span className="summary-label">Selected:</span>
                <span className="summary-values">{formData.spiritualGifts.join(', ')}</span>
              </div>
            )}
          </div>

          <div
            className="form-group spiritual-gifts-group"
            role="group"
            aria-label="Equipping gifts selection"
          >
            <label className="spiritual-gifts-label">
              Gifts to Equip God&apos;s People for Works of Service
            </label>
            <p className="field-help">
              Choose the fivefold ministry gifts that describe how you equip and develop others.
            </p>
            <div className="spiritual-gifts-grid">
              {EQUIPPING_GIFTS.map(gift => {
                const selected = isEquippingGiftSelected(gift);
                return (
                  <button
                    type="button"
                    key={gift}
                    className={`spiritual-gift-option ${selected ? 'selected' : ''}`}
                    onClick={() => toggleEquippingGift(gift)}
                    aria-pressed={selected}
                  >
                    {gift}
                  </button>
                );
              })}
            </div>
            {formData.equippingGifts.length > 0 && (
              <div className="selected-gifts-summary">
                <span className="summary-label">Selected:</span>
                <span className="summary-values">{formData.equippingGifts.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Interests */}
        <div className="edit-section">
          <h2>Interests & Hobbies</h2>
          <p className="section-desc">
            Share your interests to connect with others who share similar passions
          </p>

          <div className="interests-section">
            <div className="add-interest">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add an interest (e.g., Bible Study, Music, Community Service)"
                maxLength={30}
                className="interest-input"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                disabled={!newInterest.trim()}
                className="add-interest-btn"
              >
                Add
              </button>
            </div>

            <div className="interests-list">
              {formData.interests.map((interest, index) => (
                <div key={index} className="interest-tag">
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="remove-interest"
                    aria-label={`Remove ${interest}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {formData.interests.length === 0 && (
              <div className="no-interests">
                <p>No interests added yet. Add some to help others connect with you!</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="message error">
            <span className="message-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="message success">
            <span className="message-icon">✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Actions */}
        <div className="edit-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-btn"
            disabled={isSaving}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="save-btn"
          >
            {isSaving ? (
              <>
                <div className="save-spinner"></div>
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEdit;