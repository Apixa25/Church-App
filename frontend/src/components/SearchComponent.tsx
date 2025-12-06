import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchPosts, getFeed } from '../services/postApi';
import { profileAPI } from '../services/api';
import { prayerAPI } from '../services/prayerApi';
import { Post, PostSearchFilters, PostType } from '../types/Post';
import { UserProfile } from '../types/Profile';
import { PrayerRequest } from '../types/Prayer';
import PostCard from './PostCard';
import { useOrganization } from '../contexts/OrganizationContext';
import { useGroup } from '../contexts/GroupContext';
import LoadingSpinner from './LoadingSpinner';
import './SearchComponent.css';

interface SearchComponentProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onPostSelect?: (post: Post) => void;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onPostSelect
}) => {
  const navigate = useNavigate();
  const { searchOrganizations } = useOrganization();
  const { searchGroups } = useGroup();
  
  const [query, setQuery] = useState(initialQuery);
  // Store all search results (unfiltered)
  const [allSearchResults, setAllSearchResults] = useState<Post[]>([]);
  const [allProfileResults, setAllProfileResults] = useState<UserProfile[]>([]);
  const [allPrayerResults, setAllPrayerResults] = useState<PrayerRequest[]>([]);
  const [allOrganizationResults, setAllOrganizationResults] = useState<any[]>([]);
  const [allGroupResults, setAllGroupResults] = useState<any[]>([]);
  // Filtered results for display
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [profileResults, setProfileResults] = useState<UserProfile[]>([]);
  const [prayerResults, setPrayerResults] = useState<PrayerRequest[]>([]);
  const [organizationResults, setOrganizationResults] = useState<any[]>([]);
  const [groupResults, setGroupResults] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'trending'>('search');
  const [selectedContentType, setSelectedContentType] = useState<PostType | null | 'users' | 'organizations' | 'families' | 'groups'>(null);
  const [searchFilters, setSearchFilters] = useState<PostSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Same curated list of family-friendly emojis from FamilyGroupCreateForm
  const familyEmojis = [
    '❤️', '💚', '💛', '💙', '🧡', '💜', '🖤', '🤍', '💕', '💖',
    '🍌', '🍎', '🍊', '🍓', '🍉', '🥭', '🍑', '🍒', '🍇', '🥝',
    '🐵', '🐶', '🐱', '🐰', '🐻', '🐨', '🦊', '🐯', '🦁', '🐮',
    '🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '☁️', '🌺', '🌻',
    '🏠', '💒', '🎂', '🎉', '🎈', '🎁', '🕯️', '🦋', '🐝', '🌿'
  ];

  // Count visual emojis (helper function from FamilyGroupCreateForm)
  const countVisualEmojis = (str: string): number => {
    if (!str) return 0;
    const emojiMatches = str.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{FE0F}]/gu);
    if (!emojiMatches) return 0;
    return emojiMatches.filter(e => !/[\u{200D}\u{FE0F}]/u.test(e)).length;
  };

  type FilterValue = PostType | 'users' | 'organizations' | 'families' | 'groups';

  const quickFilters: Array<{ label: string; value: FilterValue; icon: string }> = [
    { label: 'Posts', value: PostType.GENERAL, icon: '📝' },
    { label: 'Prayers', value: PostType.PRAYER, icon: '🙏' },
    { label: 'Testimonies', value: PostType.TESTIMONY, icon: '✨' },
    { label: 'Announcements', value: PostType.ANNOUNCEMENT, icon: '📢' },
    { label: 'Organizations', value: 'organizations' as FilterValue, icon: '🏛️' },
    { label: 'Families', value: 'families' as FilterValue, icon: '🏠' },
    { label: 'Groups', value: 'groups' as FilterValue, icon: '👥' }
  ];

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }

      // Load trending posts when opened
      loadTrendingPosts();
    }
  }, [isOpen, initialQuery]);

  // Handle emoji click - add emoji to search query
  const handleEmojiClick = (emoji: string) => {
    setQuery(prev => prev + emoji);
    setShowEmojiPicker(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Apply content type filter to displayed results
  const applyContentTypeFilter = useCallback((contentType: PostType | null | 'users' | 'organizations' | 'families' | 'groups', allPosts: Post[], allProfiles: UserProfile[], allPrayers: PrayerRequest[], allOrgs: any[], allGroups: any[]) => {
    console.log('🔍 applyContentTypeFilter called with:', contentType);
    if (!contentType) {
      setSearchResults(allPosts);
      setProfileResults(allProfiles);
      setPrayerResults(allPrayers);
      setOrganizationResults(allOrgs);
      setGroupResults(allGroups);
    } else if (contentType === 'users') {
      setSearchResults([]);
      setProfileResults(allProfiles);
      setPrayerResults([]);
      setOrganizationResults([]);
      setGroupResults([]);
    } else if (contentType === 'organizations') {
      // Show all organizations (including families)
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults([]);
      setOrganizationResults(allOrgs);
      setGroupResults([]);
    } else if (contentType === 'families') {
      // Show only family organizations
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults([]);
      setOrganizationResults(allOrgs.filter(org => org.type === 'FAMILY'));
      setGroupResults([]);
    } else if (contentType === 'groups') {
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults([]);
      setOrganizationResults([]);
      setGroupResults(allGroups);
    } else if (contentType === PostType.PRAYER) {
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults(allPrayers);
      setOrganizationResults([]);
      setGroupResults([]);
    } else {
      const filteredPosts = allPosts.filter(post => post.postType === contentType);
      setSearchResults(filteredPosts);
      setProfileResults([]);
      setPrayerResults([]);
      setOrganizationResults([]);
      setGroupResults([]);
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      console.log('🔍 Starting search for:', query);
      const [postsResponse, profilesResponse, prayersResponse, orgsResponse, groupsResponse] = await Promise.all([
        searchPosts(query, 0, 20, {}).catch(err => {
          console.error('Post search error:', err);
          return { content: [] };
        }),
        profileAPI.searchUsers(query, 0, 20).catch(err => {
          console.error('Profile search error:', err);
          return { data: { content: [] } };
        }),
        prayerAPI.searchPrayerRequests(query, 0, 20).catch(err => {
          console.error('Prayer search error:', err);
          return { data: { content: [] } };
        }),
        searchOrganizations(query, 0, 20).catch(err => {
          console.error('Organization search error:', err);
          return { content: [] };
        }),
        searchGroups(query, 0, 20).catch(err => {
          console.error('Group search error:', err);
          return { content: [] };
        })
      ]);

      const allPosts = postsResponse.content || [];
      const profileData = profilesResponse.data?.content || profilesResponse.data || [];
      const allProfiles = Array.isArray(profileData) ? profileData : [];
      const prayerData = prayersResponse.data?.content || prayersResponse.data || [];
      const allPrayers = Array.isArray(prayerData) ? prayerData : [];
      const allOrgs = orgsResponse.content || [];
      const allGroups = groupsResponse.content || [];
      
      setAllSearchResults(allPosts);
      setAllProfileResults(allProfiles);
      setAllPrayerResults(allPrayers);
      setAllOrganizationResults(allOrgs);
      setAllGroupResults(allGroups);
      
      applyContentTypeFilter(selectedContentType, allPosts, allProfiles, allPrayers, allOrgs, allGroups);
      
      console.log('✅ Final search results - Posts:', allPosts.length, 
                  'Profiles:', allProfiles.length,
                  'Prayers:', allPrayers.length,
                  'Organizations:', allOrgs.length,
                  'Groups:', allGroups.length);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setAllSearchResults([]);
      setAllProfileResults([]);
      setAllPrayerResults([]);
      setAllOrganizationResults([]);
      setAllGroupResults([]);
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults([]);
      setOrganizationResults([]);
      setGroupResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, selectedContentType, applyContentTypeFilter, searchOrganizations, searchGroups]);

  useEffect(() => {
    // Debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else {
      setAllSearchResults([]);
      setAllProfileResults([]);
      setAllPrayerResults([]);
      setAllOrganizationResults([]);
      setAllGroupResults([]);
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults([]);
      setOrganizationResults([]);
      setGroupResults([]);
      setHasSearched(false);
      setSelectedContentType(null);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Apply content type filter when it changes
  useEffect(() => {
    if (hasSearched) {
      console.log('🔄 useEffect triggered - selectedContentType:', selectedContentType, 'hasSearched:', hasSearched);
      applyContentTypeFilter(selectedContentType, allSearchResults, allProfileResults, allPrayerResults, allOrganizationResults, allGroupResults);
    }
  }, [selectedContentType, allSearchResults, allProfileResults, allPrayerResults, allOrganizationResults, allGroupResults, hasSearched, applyContentTypeFilter]);

  const loadTrendingPosts = async () => {
    try {
      const response = await getFeed('trending', 0, 10);
      setTrendingPosts(response.content);
    } catch (error) {
      console.error('Error loading trending posts:', error);
    }
  };

  const handleQuickFilter = (filterValue: PostType | 'users' | 'organizations' | 'families' | 'groups', fromDropdown: boolean = false) => {
    console.log('🔘 handleQuickFilter called with:', filterValue, 'current selectedContentType:', selectedContentType);
    // Toggle filter only for button clicks (not dropdown) - if same type is clicked, clear filter
    if (!fromDropdown && selectedContentType === filterValue) {
      console.log('🔄 Toggling off filter');
      setSelectedContentType(null);
    } else {
      console.log('✅ Setting filter to:', filterValue);
      setSelectedContentType(filterValue);
    }
    setActiveTab('search');
  };

  const handleAllFilter = (fromDropdownOrEvent?: boolean | React.MouseEvent<HTMLButtonElement>) => {
    const fromDropdown = typeof fromDropdownOrEvent === 'boolean' ? fromDropdownOrEvent : false;
    console.log('🔘 handleAllFilter called - clearing filter');
    setSelectedContentType(null);
    setActiveTab('search');
  };

  const handleFilterChange = (filterType: keyof PostSearchFilters, value: any) => {
    setSearchFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };


  const clearSearch = () => {
    setQuery('');
    setAllSearchResults([]);
    setAllProfileResults([]);
    setAllPrayerResults([]);
    setAllOrganizationResults([]);
    setAllGroupResults([]);
    setSearchResults([]);
    setProfileResults([]);
    setPrayerResults([]);
    setOrganizationResults([]);
    setGroupResults([]);
    setHasSearched(false);
    setSelectedContentType(null);
    setSearchFilters({});
    setShowEmojiPicker(false);
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="search-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="search-container">
        {/* Header */}
        <div className="search-header">
          <div className="search-input-container">
            <button
              className="close-search-btn-inline"
              onClick={onClose}
              aria-label="Close search"
            >
              ✕
            </button>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, people, organizations, or topics..."
              className="search-input"
              maxLength={100}
            />
            {/* Emoji Picker Button */}
            <button
              type="button"
              className="emoji-picker-btn"
              onClick={(e) => {
                e.stopPropagation();
                console.log('😀 Emoji picker button clicked! showEmojiPicker:', showEmojiPicker);
                setShowEmojiPicker(!showEmojiPicker);
              }}
              aria-label="Open emoji picker"
              title="Add emoji to search"
            >
              😀
            </button>
            {query && (
              <button
                className="clear-search-btn"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            {/* Emoji Picker Dropdown - moved inside search-input-container for proper positioning */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="emoji-picker-dropdown">
                <div className="emoji-picker-header">
                  <span>Select Emoji</span>
                  <button
                    type="button"
                    className="emoji-picker-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmojiPicker(false);
                    }}
                    aria-label="Close emoji picker"
                  >
                    ✕
                  </button>
                </div>
                <div className="emoji-picker-grid">
                  {familyEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      className="emoji-picker-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmojiClick(emoji);
                      }}
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Filters and Time Range - Mobile: Dropdowns (always visible) */}
        <div className="quick-filters-mobile-container">
          <select
            className="quick-filters-dropdown"
            value={selectedContentType === null ? 'all' : (typeof selectedContentType === 'string' ? selectedContentType : PostType[selectedContentType as keyof typeof PostType])}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const value = e.target.value;
              console.log('📋 Dropdown changed to:', value);
              if (value === 'all') {
                handleAllFilter(true); // Pass true to indicate it's from dropdown
              } else {
                // Convert string back to PostType enum or FilterValue
                let filterValue: FilterValue;
                if (value === 'GENERAL' || value === 'PRAYER' || value === 'TESTIMONY' || value === 'ANNOUNCEMENT') {
                  filterValue = PostType[value as keyof typeof PostType];
                } else {
                  filterValue = value as FilterValue;
                }
                console.log('📋 Setting filterValue to:', filterValue);
                handleQuickFilter(filterValue, true); // Pass true to indicate it's from dropdown
              }
            }}
          >
            <option value="all">🌐 All</option>
            {quickFilters.map(filter => (
              <option key={filter.value} value={typeof filter.value === 'string' ? filter.value : PostType[filter.value as keyof typeof PostType]}>
                {filter.icon} {filter.label}
              </option>
            ))}
            <option value="users">👤 Users</option>
          </select>
          
          {/* Time Range Filter - Always visible */}
          <select
            value={searchFilters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="time-range-dropdown"
          >
            <option value="">Any time</option>
            <option value={new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>Last 24 hours</option>
            <option value={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>Last week</option>
            <option value={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>Last month</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="search-tabs">
          <button
            className={`search-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search Results {hasSearched && (searchResults.length + profileResults.length + prayerResults.length + organizationResults.length + groupResults.length) > 0 && `(${searchResults.length + profileResults.length + prayerResults.length + organizationResults.length + groupResults.length})`}
          </button>
          <button
            className={`search-tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            Trending
          </button>
        </div>

        {/* Content */}
        <div className="search-content">
          {activeTab === 'search' ? (
            <>
              {/* Search Suggestions (when no query) - Desktop only */}
              {!query && !hasSearched && (
                <div className="search-suggestions">
                  {/* Desktop: Pill buttons */}
                  <div className="quick-filters">
                    <button
                      className={`quick-filter-btn ${selectedContentType === null ? 'active' : ''}`}
                      onClick={handleAllFilter}
                    >
                      <span className="filter-icon">🌐</span>
                      All
                    </button>
                    {quickFilters.map(filter => (
                      <button
                        key={filter.value}
                        className={`quick-filter-btn ${selectedContentType === filter.value ? 'active' : ''}`}
                        onClick={() => handleQuickFilter(filter.value)}
                      >
                        <span className="filter-icon">{filter.icon}</span>
                        {filter.label}
                      </button>
                    ))}
                    <button
                      className={`quick-filter-btn ${selectedContentType === 'users' ? 'active' : ''}`}
                      onClick={() => handleQuickFilter('users')}
                    >
                      <span className="filter-icon">👤</span>
                      Users
                    </button>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {isSearching && (
                <div className="search-loading">
                  <LoadingSpinner type="multi-ring" size="medium" text="Searching..." />
                </div>
              )}

              {!isSearching && hasSearched && searchResults.length === 0 && profileResults.length === 0 && prayerResults.length === 0 && organizationResults.length === 0 && groupResults.length === 0 && query && (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <h3>No results found</h3>
                  <p>Try different keywords or check your spelling</p>
                  <div className="search-tips">
                    <strong>Tips:</strong>
                    <ul>
                      <li>Use fewer keywords</li>
                      <li>Try different spellings</li>
                      <li>Search for hashtags (e.g., #PrayerRequest)</li>
                      <li>Try searching with emojis for family groups</li>
                    </ul>
                  </div>
                </div>
              )}

              {!isSearching && (searchResults.length > 0 || profileResults.length > 0 || prayerResults.length > 0 || organizationResults.length > 0 || groupResults.length > 0) && (
                <div className="search-results">
                  {/* Profile Results */}
                  {profileResults.length > 0 && (
                    <div className="results-section">
                      <div className="results-header">
                        <span className="results-section-title">👤 People ({profileResults.length})</span>
                      </div>
                      <div className="results-list">
                        {profileResults.map(profile => (
                          <div 
                            key={profile.userId} 
                            className="search-result-item profile-result"
                            onClick={() => handleProfileClick(profile.userId)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="profile-result-content">
                              <img 
                                src={profile.profilePicUrl || '/logo192.png'} 
                                alt={profile.name}
                                className="profile-result-avatar"
                              />
                              <div className="profile-result-info">
                                <div className="profile-result-name">{profile.name}</div>
                                {profile.bio && (
                                  <div className="profile-result-bio">{profile.bio}</div>
                                )}
                                <div className="profile-result-role">{profile.role}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Organization Results */}
                  {organizationResults.length > 0 && (
                    <div className="results-section">
                      <div className="results-header">
                        <span className="results-section-title">🏛️ Organizations ({organizationResults.length})</span>
                      </div>
                      <div className="results-list">
                        {organizationResults.map(org => (
                          <div 
                            key={org.id} 
                            className="search-result-item organization-result"
                            onClick={() => navigate(`/organizations/${org.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="organization-result-content">
                              {org.logoUrl ? (
                                <img 
                                  src={org.logoUrl} 
                                  alt={org.name}
                                  className="organization-result-logo"
                                />
                              ) : (
                                <div className="organization-result-icon">
                                  {org.type === 'FAMILY' ? '🏠' : '🏛️'}
                                </div>
                              )}
                              <div className="organization-result-info">
                                <div className="organization-result-name">{org.name}</div>
                                {org.description && (
                                  <div className="organization-result-description">
                                    {org.description.length > 150 
                                      ? `${org.description.substring(0, 150)}...` 
                                      : org.description}
                                  </div>
                                )}
                                <div className="organization-result-meta">
                                  <span className="organization-result-type">{org.type}</span>
                                  {org.memberCount !== undefined && (
                                    <span className="organization-result-members">
                                      {org.memberCount} members
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group Results */}
                  {groupResults.length > 0 && (
                    <div className="results-section">
                      <div className="results-header">
                        <span className="results-section-title">👥 Groups ({groupResults.length})</span>
                      </div>
                      <div className="results-list">
                        {groupResults.map(group => (
                          <div 
                            key={group.id} 
                            className="search-result-item group-result"
                            onClick={() => navigate(`/groups/${group.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="group-result-content">
                              {group.imageUrl ? (
                                <img 
                                  src={group.imageUrl} 
                                  alt={group.name}
                                  className="group-result-image"
                                />
                              ) : (
                                <div className="group-result-icon">💬</div>
                              )}
                              <div className="group-result-info">
                                <div className="group-result-name">{group.name}</div>
                                {group.description && (
                                  <div className="group-result-description">
                                    {group.description.length > 150 
                                      ? `${group.description.substring(0, 150)}...` 
                                      : group.description}
                                  </div>
                                )}
                                <div className="group-result-meta">
                                  <span className="group-result-visibility">{group.visibility}</span>
                                  {group.memberCount !== undefined && (
                                    <span className="group-result-members">
                                      {group.memberCount} members
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prayer Request Results */}
                  {prayerResults.length > 0 && (
                    <div className="results-section">
                      <div className="results-header">
                        <span className="results-section-title">🙏 Prayer Requests ({prayerResults.length})</span>
                      </div>
                      <div className="results-list">
                        {prayerResults.map(prayer => (
                          <div 
                            key={prayer.id} 
                            className="search-result-item prayer-result"
                            onClick={() => navigate(`/prayers/${prayer.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="prayer-result-content">
                              <div className="prayer-result-icon">🙏</div>
                              <div className="prayer-result-info">
                                <div className="prayer-result-title">{prayer.title}</div>
                                {prayer.description && (
                                  <div className="prayer-result-description">
                                    {prayer.description.length > 150 
                                      ? `${prayer.description.substring(0, 150)}...` 
                                      : prayer.description}
                                  </div>
                                )}
                                <div className="prayer-result-meta">
                                  <span className="prayer-result-author">
                                    {prayer.isAnonymous ? 'Anonymous' : prayer.userName}
                                  </span>
                                  <span className="prayer-result-category">{prayer.category}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post Results */}
                  {searchResults.length > 0 && (
                    <div className="results-section">
                      <div className="results-header">
                        <span className="results-section-title">📝 Posts ({searchResults.length})</span>
                      </div>
                      <div className="results-list">
                        {searchResults.map(post => (
                          <div key={post.id} className="search-result-item">
                            <PostCard
                              post={post}
                              onPostUpdate={() => {}} // Could be enhanced
                              onPostDelete={(postId) => {
                                setAllSearchResults(prev => prev.filter(p => p.id !== postId));
                                setSearchResults(prev => prev.filter(p => p.id !== postId));
                              }}
                              compact={true}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Trending Content */
            <div className="trending-content">
              <div className="trending-header">
                <h3>🔥 Trending in Your Community</h3>
                <p>Popular posts from your church family</p>
              </div>

              {trendingPosts.length === 0 ? (
                <div className="no-trending">
                  <div className="no-trending-icon">📈</div>
                  <p>No trending posts yet. Be the first to share something amazing!</p>
                </div>
              ) : (
                <div className="trending-posts">
                  {trendingPosts.map((post, index) => (
                    <div key={post.id} className="trending-post-item">
                      <div className="trending-rank">#{index + 1}</div>
                      <PostCard
                        post={post}
                        onPostUpdate={() => {}}
                        onPostDelete={(postId) => {
                          setTrendingPosts(prev => prev.filter(p => p.id !== postId));
                        }}
                        compact={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchComponent;
