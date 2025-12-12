import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types/Post';
import { UserProfile } from '../types/Profile';
import { updateUserProfile, uploadProfilePicture, uploadBannerImage } from '../services/postApi';
import { processImageForUpload, isValidImageFile } from '../utils/imageUtils';
import LoadingSpinner from './LoadingSpinner';
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
  email: string;
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
    email: '',
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
  
  // 🐛 iPhone Debug Panel State
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // 🐛 Debug logging function for iPhone debugging
  const addDebugLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
    console.log(message, data || '');
    setDebugLogs(prev => [...prev.slice(-29), logEntry]); // Keep last 30 logs
  };

  // Load current user data or external profile
  useEffect(() => {
    const profileToUse = externalProfile || user;
    if (profileToUse) {
      setFormData({
        name: profileToUse.name || '',
        email: profileToUse.email || '',
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

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type using shared utility
      if (!isValidImageFile(file)) {
        setError('Please select a valid image file (JPG, PNG, GIF, WebP, or HEIC)');
        console.log('File rejected - type:', file.type, 'name:', file.name);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        setError('Image file size must be less than 100MB');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Clean up previous preview URL if it exists
      if (profilePicPreview && profilePicPreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicPreview);
      }

      // Process image for upload (converts HEIC from iPhone, compresses large files)
      try {
        setError('');
        console.log('📷 Processing profile picture for upload...');
        
        // Profile pics use smaller dimensions (800x800) and lower size threshold (3MB)
        const processedFile = await processImageForUpload(file, 800, 800, 3 * 1024 * 1024);
        
        setProfilePicFile(processedFile);
        setProfilePicPreview(URL.createObjectURL(processedFile));
        console.log('✅ Profile picture ready for upload');
      } catch (conversionError) {
        console.error('❌ Image processing failed:', conversionError);
        // Fallback: try to use original file
        console.warn('⚠️ Using original file as fallback');
        setProfilePicFile(file);
        setProfilePicPreview(URL.createObjectURL(file));
      }
      
      setError('');
      
      // Reset input value to allow selecting the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBannerImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type using shared utility
      if (!isValidImageFile(file)) {
        setError('Please select a valid image file (JPG, PNG, GIF, WebP, or HEIC)');
        console.log('File rejected - type:', file.type, 'name:', file.name);
        if (bannerInputRef.current) {
          bannerInputRef.current.value = '';
        }
        return;
      }

      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        setError('Banner image file size must be less than 100MB');
        if (bannerInputRef.current) {
          bannerInputRef.current.value = '';
        }
        return;
      }

      // Clean up previous preview URL if it exists
      if (bannerImagePreview && bannerImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(bannerImagePreview);
      }

      // Process image for upload (converts HEIC from iPhone, compresses large files)
      try {
        setError('');
        console.log('📷 Processing banner image for upload...');
        
        // Banner images use larger dimensions (1920x1920) and higher size threshold (5MB)
        const processedFile = await processImageForUpload(file, 1920, 1920, 5 * 1024 * 1024);
        
        setBannerImageFile(processedFile);
        setBannerImagePreview(URL.createObjectURL(processedFile));
        console.log('✅ Banner image ready for upload');
      } catch (conversionError) {
        console.error('❌ Image processing failed:', conversionError);
        // Fallback: try to use original file
        console.warn('⚠️ Using original file as fallback');
        setBannerImageFile(file);
        setBannerImagePreview(URL.createObjectURL(file));
      }
      
      // Reset input value to allow selecting the same file again if needed
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
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

    if (formData.bio && formData.bio.length > 2000) {
      setError('Bio must be less than 2,000 characters');
      return false;
    }

    if (formData.email && !isValidEmail(formData.email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.website && !isValidUrl(formData.website)) {
      setError('Please enter a valid website URL');
      return false;
    }

    // Address fields are now optional - no validation required

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

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsSaving(true);
    setError('');
    setSuccess('');
    
    // 🐛 iPhone Debug: Clear logs and show panel
    const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    setDebugLogs([]);
    if (isIPhone) {
      setShowDebugPanel(true);
    }
    
    addDebugLog('🚀 Profile save started', {
      hasProfilePic: !!profilePicFile,
      hasBannerImage: !!bannerImageFile,
      bannerFileSize: bannerImageFile ? (bannerImageFile.size / 1024 / 1024).toFixed(2) + 'MB' : 'none',
      bannerFileType: bannerImageFile?.type || 'none',
      bannerFileName: bannerImageFile?.name || 'none',
      device: isIPhone ? 'iPhone' : 'Other',
      userAgent: navigator.userAgent.substring(0, 100)
    });

    try {
      // Upload profile picture if changed
      let profilePicUrl = user.profilePicUrl;
      if (profilePicFile) {
        addDebugLog('📤 Uploading profile picture...', {
          fileName: profilePicFile.name,
          fileSize: (profilePicFile.size / 1024 / 1024).toFixed(2) + 'MB',
          fileType: profilePicFile.type
        });
        const uploadResult = await uploadProfilePicture(profilePicFile);
        profilePicUrl = uploadResult;
        addDebugLog('✅ Profile picture uploaded', { url: uploadResult });
      }

      // Upload banner image if changed
      let bannerImageUrl = (user as any).bannerImageUrl || (externalProfile as any)?.bannerImageUrl;
      if (bannerImageFile) {
        try {
          addDebugLog('🖼️ Starting banner image upload...', {
            fileName: bannerImageFile.name,
            fileSize: (bannerImageFile.size / 1024 / 1024).toFixed(2) + 'MB',
            fileType: bannerImageFile.type,
            isIPhone: isIPhone
          });
          
          const uploadResult = await uploadBannerImage(bannerImageFile);
          bannerImageUrl = uploadResult;
          addDebugLog('✅ Banner image uploaded successfully', { url: uploadResult });
        } catch (bannerErr: any) {
          addDebugLog('❌ Banner upload FAILED', {
            message: bannerErr?.message,
            status: bannerErr?.response?.status,
            statusText: bannerErr?.response?.statusText,
            isNetworkError: !bannerErr?.response,
            isTimeout: bannerErr?.code === 'ECONNABORTED',
            errorName: bannerErr?.name,
            errorCode: bannerErr?.code,
            responseData: bannerErr?.response?.data,
            config: {
              url: bannerErr?.config?.url,
              method: bannerErr?.config?.method
            }
          });
          
          // If banner upload endpoint doesn't exist yet, use profile picture endpoint as fallback
          try {
            addDebugLog('⚠️ Trying fallback: profile picture endpoint...');
            const uploadResult = await uploadProfilePicture(bannerImageFile);
            bannerImageUrl = uploadResult;
            addDebugLog('✅ Banner uploaded via fallback endpoint', { url: uploadResult });
          } catch (fallbackErr: any) {
            addDebugLog('❌ Fallback upload also FAILED', {
              message: fallbackErr?.message,
              status: fallbackErr?.response?.status,
              isNetworkError: !fallbackErr?.response,
              responseData: fallbackErr?.response?.data
            });
            throw new Error(`Failed to upload banner image: ${bannerErr.message || 'Unknown error'}`);
          }
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

      const updatedProfile: any = {
        ...restFormData,
        name: restFormData.name.trim(),
        email: restFormData.email.trim() || undefined,
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
        interests: JSON.stringify(interests), // Convert array to JSON string for backend
        latitude: latitudeValue,
        longitude: longitudeValue,
        geocodeStatus: geocodeStatus.trim()
      };

      // Only include profilePicUrl if it has a value (prevents clearing Google OAuth images)
      if (profilePicUrl) {
        updatedProfile.profilePicUrl = profilePicUrl;
      }

      // Only include bannerImageUrl if it has a value
      if (bannerImageUrl) {
        updatedProfile.bannerImageUrl = bannerImageUrl;
      }

      addDebugLog('📤 Updating profile...', {
        hasProfilePicUrl: !!updatedProfile.profilePicUrl,
        hasBannerImageUrl: !!updatedProfile.bannerImageUrl
      });
      
      const result = await updateUserProfile(user!.userId, updatedProfile);
      addDebugLog('✅ Profile updated successfully!');

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

      // Navigate back to profile and scroll to top after a short delay
      setTimeout(() => {
        navigate('/profile', { 
          replace: false,
          state: { scrollToTop: true } // Pass flag to indicate we want to scroll to top
        });
        // Scroll to top after navigation - use requestAnimationFrame for reliable timing
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          // Additional scroll attempts to ensure it works after React renders
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 200);
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 500);
        });
      }, 1500);

    } catch (err: any) {
      console.error('Error updating profile:', err);
      addDebugLog('❌ Profile save FAILED', {
        message: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        isNetworkError: !err?.response,
        isTimeout: err?.code === 'ECONNABORTED',
        errorName: err?.name,
        errorCode: err?.code,
        responseData: err?.response?.data,
        stack: err?.stack?.substring(0, 200)
      });
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/profile');
    }
  };

  const removeProfilePicture = () => {
    // Clean up preview URL if it's a blob URL
    if (profilePicPreview && profilePicPreview.startsWith('blob:')) {
      URL.revokeObjectURL(profilePicPreview);
    }
    setProfilePicFile(null);
    setProfilePicPreview('');
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeBannerImage = () => {
    // Clean up preview URL if it's a blob URL
    if (bannerImagePreview && bannerImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(bannerImagePreview);
    }
    setBannerImageFile(null);
    setBannerImagePreview('');
    // Reset input value
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="profile-edit loading">
        <div className="loading-content">
          <LoadingSpinner type="multi-ring" size="medium" text="Loading your profile..." />
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
            <small>Upload a wide image (JPG, PNG) up to 15MB. Recommended size: 1500x500px</small>
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
            <small>Upload a square image (JPG, PNG) up to 15MB for best results</small>
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
              maxLength={2000}
              rows={4}
              className="form-textarea"
            />
            <small className="char-count">{formData.bio.length}/2,000</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your.email@example.com"
              className="form-input"
            />
            <small className="field-help">Optional: Share your email with others who view your profile</small>
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
              <label htmlFor="addressLine1">Address Line 1</label>
              <input
                id="addressLine1"
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                placeholder="123 Church Street"
                maxLength={255}
                className="form-input"
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
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
                maxLength={100}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="stateProvince">State / Province</label>
              <input
                id="stateProvince"
                type="text"
                value={formData.stateProvince}
                onChange={(e) => handleInputChange('stateProvince', e.target.value)}
                placeholder="State or province"
                maxLength={100}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="postalCode">Postal Code</label>
              <input
                id="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                placeholder="ZIP or postal code"
                maxLength={20}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Country"
                maxLength={100}
                className="form-input"
              />
            </div>
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

        {/* 🐛 iPhone Debug Panel - Shows console logs on screen */}
        {showDebugPanel && debugLogs.length > 0 && (
          <div className="debug-panel">
            <div className="debug-panel-header">
              <span>🐛 Debug Logs (iPhone)</span>
              <button 
                type="button"
                onClick={() => setShowDebugPanel(false)}
                className="debug-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="debug-panel-content">
              {debugLogs.map((log, index) => (
                <div key={index} className="debug-log-entry">
                  {log}
                </div>
              ))}
            </div>
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