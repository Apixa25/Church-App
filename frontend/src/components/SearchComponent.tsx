import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchPosts, getFeed } from '../services/postApi';
import { Post, FeedType, PostSearchFilters } from '../types/Post';
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
  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'trending'>('search');
  const [searchFilters, setSearchFilters] = useState<PostSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Popular search terms and hashtags for church community
  const popularSearches = [
    '#PrayerRequest', '#Testimony', '#BibleStudy', '#ChurchLife',
    '#Worship', '#Community', '#Outreach', '#Fellowship'
  ];

  const quickFilters = [
    { label: 'Posts', value: 'posts', icon: '📝' },
    { label: 'Prayers', value: 'prayers', icon: '🙏' },
    { label: 'Testimonies', value: 'testimonies', icon: '✨' },
    { label: 'Announcements', value: 'announcements', icon: '📢' }
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
      setHasSearched(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchFilters]);

  const loadTrendingPosts = async () => {
    try {
      const response = await getFeed('trending', 0, 10);
      setTrendingPosts(response.content);
    } catch (error) {
      console.error('Error loading trending posts:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const filters: PostSearchFilters = {
        ...searchFilters,
        query: query.trim()
      };

      const response = await searchPosts(query, 0, 20, filters);
      setSearchResults(response.content);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setActiveTab('search');
  };

  const handleFilterChange = (filterType: keyof PostSearchFilters, value: any) => {
    setSearchFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handlePostClick = (post: Post) => {
    if (onPostSelect) {
      onPostSelect(post);
    }
    onClose();
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setSearchFilters({});
    setShowFilters(false);
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
              ⚙️ Filters
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
                        className="quick-filter-btn"
                        onClick={() => handleQuickSearch(filter.value)}
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

              {!isSearching && hasSearched && searchResults.length === 0 && query && (
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

              {!isSearching && searchResults.length > 0 && (
                <div className="search-results">
                  <div className="results-header">
                    <span className="results-count">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </span>
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
