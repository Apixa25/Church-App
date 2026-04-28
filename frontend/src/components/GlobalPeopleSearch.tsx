import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import chatApi, { ChatPeopleSearchResult } from '../services/chatApi';

const MIN_QUERY_LENGTH = 3;

const GlobalPeopleSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatPeopleSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingChatUserId, setCreatingChatUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const trimmedQuery = query.trim();
    setError(null);

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await chatApi.searchGlobalPeople(trimmedQuery, 0, 12);
        setResults(response.content || []);
      } catch (err) {
        console.error('Error searching people:', err);
        setError('Could not search people right now. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleStartChat = async (person: ChatPeopleSearchResult) => {
    try {
      setCreatingChatUserId(person.userId);
      setError(null);

      const dmGroup = await chatApi.createDirectMessageByUserId(person.userId);
      navigate(`/chats/${dmGroup.id}`);
    } catch (err: any) {
      console.error('Error starting global person chat:', err);
      const errorMessage = err.response?.data?.error || 'Could not start this conversation.';
      setError(errorMessage);
    } finally {
      setCreatingChatUserId(null);
    }
  };

  return (
    <div className="global-people-search">
      <div className="global-people-search-header">
        <div>
          <h3>Find People</h3>
          <p>
            Search for a specific person outside your church. This is not a browsable app-wide directory.
          </p>
        </div>
      </div>

      <div className="global-people-search-box">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search people across The Gathering"
        />
        {isSearching && <span className="global-search-status">Searching...</span>}
      </div>

      {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
        <p className="global-people-search-hint">
          Type at least {MIN_QUERY_LENGTH} characters to search.
        </p>
      )}

      {error && <div className="global-people-search-error">{error}</div>}

      {query.trim().length >= MIN_QUERY_LENGTH && !isSearching && results.length === 0 && !error && (
        <div className="empty-state">
          <p>No people found for "{query.trim()}".</p>
          <p>Try a more specific name or email.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="global-people-results">
          {results.map((person) => (
            <div key={person.userId} className="global-person-result">
              <button
                type="button"
                className="global-person-avatar"
                onClick={() => navigate(`/profile/${person.userId}`)}
                aria-label={`View ${person.name}'s profile`}
              >
                {person.profilePicUrl ? (
                  <img src={person.profilePicUrl} alt={person.name} />
                ) : (
                  <span>{person.name.charAt(0).toUpperCase()}</span>
                )}
              </button>

              <div className="global-person-info">
                <h4>{person.name}</h4>
                {person.location && <p>{person.location}</p>}
                {person.bio && <p className="global-person-bio">{person.bio}</p>}
              </div>

              <button
                type="button"
                className="global-person-message-button"
                onClick={() => handleStartChat(person)}
                disabled={creatingChatUserId === person.userId}
              >
                {creatingChatUserId === person.userId ? 'Starting...' : 'Message'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalPeopleSearch;
