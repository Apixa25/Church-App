import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import chatApi, { SearchRequest, SearchResponse } from '../services/chatApi';
import { formatTimeOrDate } from '../utils/serverTime';

const PAGE_SIZE = 20;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ChatSearch: React.FC = () => {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Seed search from query param ?q=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    if (q) {
      setQuery(q);
    }
  }, [location.search]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: SearchRequest = {
        query: searchQuery.trim(),
        limit: PAGE_SIZE,
        offset: 0
      };

      const response = await chatApi.searchMessages(request);
      setResults(response);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreMessages = async () => {
    if (!results || !results.metadata?.hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const response = await chatApi.searchMessages({
        query: results.metadata.query,
        limit: PAGE_SIZE,
        offset: results.metadata.offset + results.metadata.limit
      });
      setResults(prev => prev ? {
        ...response,
        messages: [...prev.messages, ...response.messages],
        // Group/people sections are not paginated; keep the first page's results
        groups: prev.groups,
        users: prev.users
      } : response);
    } catch (err) {
      setError('Could not load more results.');
      console.error('Search error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleMessageClick = (message: any) => {
    navigate(`/chats/${message.chatGroupId}`);
  };

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    const parts = text.split(regex);
    const lowered = searchQuery.toLowerCase();
    
    return parts.map((part, index) =>
      part.toLowerCase() === lowered ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  const formatTimestamp = (timestamp: string) => formatTimeOrDate(timestamp) || 'Invalid date';

  return (
    <div className="chat-search">
      <div className="search-header">
        <h2>🔍 Search Messages</h2>
        <button onClick={() => navigate('/chats')} className="back-button">
          ← Back to Chats
        </button>
      </div>

      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages, groups, or people..."
          className="search-input"
          autoFocus
        />
        {loading && <div className="search-loading">🔄</div>}
      </div>

      {error && (
        <div className="search-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {results && (
        <div className="search-results">
          {results.messages && results.messages.length > 0 && (
            <div className="results-section">
              <h3>💬 Messages ({results.metadata?.totalResults ?? results.messages.length})</h3>
              <div className="messages-results">
                {results.messages.map((message) => (
                  <div
                    key={message.id}
                    className="search-result-item message-result"
                    onClick={() => handleMessageClick(message)}
                  >
                    <div className="result-header">
                      <div className="result-user">
                        {message.userProfilePicUrl && (
                          <img src={message.userProfilePicUrl} alt={message.userName} className="user-avatar" />
                        )}
                        <span className="user-name">{message.userDisplayName}</span>
                      </div>
                      <div className="result-meta">
                        <span className="group-name">in {message.chatGroupName}</span>
                        <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                      </div>
                    </div>
                    <div className="result-content">
                      {highlightText(message.content, query)}
                    </div>
                    {message.messageType !== 'TEXT' && (
                      <div className="message-type-indicator">
                        {message.messageTypeDisplay}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {results.metadata?.hasMore && (
                <div className="load-more">
                  <button
                    type="button"
                    className="load-more-button"
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more results'}
                  </button>
                </div>
              )}
            </div>
          )}

          {results.groups && results.groups.length > 0 && (
            <div className="results-section">
              <h3>👥 Groups ({results.groups.length})</h3>
              <div className="groups-results">
                {results.groups.map((group) => (
                  <div
                    key={group.id}
                    className="search-result-item group-result"
                    onClick={() => navigate(`/chats/${group.id}`)}
                  >
                    <div className="group-icon">
                      {group.imageUrl ? (
                        <img src={group.imageUrl} alt={group.name} />
                      ) : (
                        <span>💬</span>
                      )}
                    </div>
                    <div className="group-info">
                      <div className="group-name">
                        {highlightText(group.name, query)}
                      </div>
                      <div className="group-description">
                        {group.description && highlightText(group.description, query)}
                      </div>
                      <div className="group-meta">
                        {group.memberCount} members • {group.type.replace('_', ' ').toLowerCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.users && results.users.length > 0 && (
            <div className="results-section">
              <h3>👤 People ({results.users.length})</h3>
              <div className="users-results">
                {results.users.map((user) => (
                  <div key={user.id} className="search-result-item user-result">
                    <div className="user-avatar">
                      {user.profilePicUrl ? (
                        <img src={user.profilePicUrl} alt={user.displayName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <div className="user-name">
                        {highlightText(user.displayName, query)}
                      </div>
                      <div className="user-role">{user.roleDisplayName}</div>
                      {user.isOnline && <div className="online-indicator">🟢 Online</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!results.messages || results.messages.length === 0) &&
           (!results.groups || results.groups.length === 0) &&
           (!results.users || results.users.length === 0) && (
            <div className="no-results">
              <p>🔍 No results found for "{query}"</p>
              <p>Try different keywords or check spelling</p>
            </div>
          )}

          {results.metadata && (
            <div className="search-metadata">
              <p>Found {results.metadata.totalResults} results in {results.metadata.searchTimeMs}ms</p>
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="search-tips">
          <h3>💡 Search Tips</h3>
          <ul>
            <li>Type at least 2 characters to search</li>
            <li>Search across all your group messages</li>
            <li>Find groups and members too</li>
            <li>Click any result to jump to that conversation</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatSearch;