import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchPosts, getFeed } from '../services/postApi';
import { profileAPI } from '../services/api';
import { prayerAPI } from '../services/prayerApi';
import { Post, PostSearchFilters, PostType } from '../types/Post';
import { UserProfile } from '../types/Profile';
import { PrayerRequest } from '../types/Prayer';
import PostCard from './PostCard';
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
  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [profileResults, setProfileResults] = useState<UserProfile[]>([]);
  const [prayerResults, setPrayerResults] = useState<PrayerRequest[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'trending'>('search');
  const [searchFilters, setSearchFilters] = useState<PostSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Popular search terms and hashtags for church community
  const popularSearches = [
    '#PrayerRequest', '#Testimony', '#BibleStudy', '#ChurchLife',
    '#Worship', '#Community', '#Outreach', '#Fellowship'
  ];

  const quickFilters = [
    { label: 'Posts', value: PostType.GENERAL, icon: '📝' },
    { label: 'Prayers', value: PostType.PRAYER, icon: '🙏' },
    { label: 'Testimonies', value: PostType.TESTIMONY, icon: '✨' },
    { label: 'Announcements', value: PostType.ANNOUNCEMENT, icon: '📢' }
  ];

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

  const performSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Search posts, profiles, and prayer requests in parallel
      const filters: PostSearchFilters = {
        ...searchFilters,
        query: query.trim()
      };

      console.log('🔍 Starting search for:', query);
      const [postsResponse, profilesResponse, prayersResponse] = await Promise.all([
        searchPosts(query, 0, 20, filters).catch(err => {
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
        })
      ]);

      console.log('📝 Posts response:', postsResponse);
      console.log('👤 Profiles response:', profilesResponse);
      console.log('🙏 Prayers response:', prayersResponse);

      setSearchResults(postsResponse.content || []);
      // Handle both Page response and direct array response
      const profileData = profilesResponse.data?.content || profilesResponse.data || [];
      setProfileResults(Array.isArray(profileData) ? profileData : []);
      
      // Only show prayer requests if:
      // 1. No filter is set (show all)
      // 2. Filter is set to PRAYER
      const prayerData = prayersResponse.data?.content || prayersResponse.data || [];
      if (!searchFilters.postType || searchFilters.postType === PostType.PRAYER) {
        setPrayerResults(Array.isArray(prayerData) ? prayerData : []);
      } else {
        setPrayerResults([]);
      }
      
      console.log('✅ Final search results - Posts:', postsResponse.content?.length || 0, 
                  'Profiles:', Array.isArray(profileData) ? profileData.length : 0,
                  'Prayers:', Array.isArray(prayerData) ? prayerData.length : 0);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, searchFilters]);

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
      setSearchResults([]);
      setProfileResults([]);
      setPrayerResults([]);
      setHasSearched(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchFilters, performSearch]);

  const loadTrendingPosts = async () => {
    try {
      const response = await getFeed('trending', 0, 10);
      setTrendingPosts(response.content);
    } catch (error) {
      console.error('Error loading trending posts:', error);
    }
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setActiveTab('search');
  };

  const handleQuickFilter = (postType: PostType) => {
    setSearchFilters(prev => ({
      ...prev,
      postType: postType
    }));
    setShowFilters(true);
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
    setSearchResults([]);
    setProfileResults([]);
    setPrayerResults([]);
    setHasSearched(false);
    setSearchFilters({});
    setShowFilters(false);
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
            <div className="search-icon">🔍</div>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, people, or topics..."
              className="search-input"
              maxLength={100}
            />
            {query && (
              <button
                className="clear-search-btn"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="search-actions">
            <button
              className="filter-toggle-btn"
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Toggle filters"
            >
              ⚙️
            </button>

            <button
              className="close-search-btn"
              onClick={onClose}
              aria-label="Close search"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="search-filters">
            <div className="filter-group">
              <label>Content Type:</label>
              <div className="filter-options">
                {quickFilters.map(filter => (
                  <button
                    key={filter.value}
                    className={`filter-option ${searchFilters.postType === filter.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange('postType', filter.value)}
                  >
                    <span className="filter-icon">{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Time Range:</label>
              <select
                value={searchFilters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="filter-select"
              >
                <option value="">Any time</option>
                <option value={new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>Last 24 hours</option>
                <option value={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>Last week</option>
                <option value={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}>Last month</option>
              </select>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="search-tabs">
          <button
            className={`search-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search Results {hasSearched && searchResults.length > 0 && `(${searchResults.length})`}
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
              {/* Search Suggestions (when no query) */}
              {!query && !hasSearched && (
                <div className="search-suggestions">
                  <h3>Popular Searches</h3>
                  <div className="suggestion-tags">
                    {popularSearches.map(term => (
                      <button
                        key={term}
                        className="suggestion-tag"
                        onClick={() => handleQuickSearch(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>

                  <h3>Quick Filters</h3>
                  <div className="quick-filters">
                    {quickFilters.map(filter => (
                      <button
                        key={filter.value}
                        className={`quick-filter-btn ${searchFilters.postType === filter.value ? 'active' : ''}`}
                        onClick={() => handleQuickFilter(filter.value)}
                      >
                        <span className="filter-icon">{filter.icon}</span>
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {isSearching && (
                <div className="search-loading">
                  <div className="loading-spinner"></div>
                  <span>Searching...</span>
                </div>
              )}

              {!isSearching && hasSearched && searchResults.length === 0 && profileResults.length === 0 && prayerResults.length === 0 && query && (
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
                    </ul>
                  </div>
                </div>
              )}

              {!isSearching && (searchResults.length > 0 || profileResults.length > 0 || prayerResults.length > 0) && (
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
