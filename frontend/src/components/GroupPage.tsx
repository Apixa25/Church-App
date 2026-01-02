import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup, Group } from '../contexts/GroupContext';
import { useAuth } from '../contexts/AuthContext';
import { getGroupFeed } from '../services/postApi';
import { Post } from '../types/Post';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import styled from 'styled-components';

const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const HeaderSection = styled.div`
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-bottom: 20px;

  &:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--accent-primary);
  }
`;

const GroupHeader = styled.div`
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-lg);
  padding: 24px;
  margin-bottom: 24px;
`;

const GroupImageContainer = styled.div`
  width: 100%;
  max-height: 200px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  margin-bottom: 16px;
`;

const GroupImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
`;

const GroupTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const GroupDescription = styled.p`
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.6;
`;

const GroupMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CreatorLink = styled.span`
  color: var(--accent-primary);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    text-decoration: underline;
    opacity: 0.8;
  }
`;

const VisibilityBadge = styled.span<{ visibility: string }>`
  display: inline-block;
  padding: 4px 12px;
  background: ${props => {
    switch (props.visibility) {
      case 'PUBLIC': return 'rgba(34, 197, 94, 0.15)';
      case 'ORG_PRIVATE': return 'rgba(251, 146, 60, 0.15)';
      case 'CROSS_ORG': return 'rgba(59, 130, 246, 0.15)';
      case 'INVITE_ONLY': return 'rgba(236, 72, 153, 0.15)';
      default: return 'var(--bg-secondary)';
    }
  }};
  color: ${props => {
    switch (props.visibility) {
      case 'PUBLIC': return '#22c55e';
      case 'ORG_PRIVATE': return '#fb923c';
      case 'CROSS_ORG': return '#3b82f6';
      case 'INVITE_ONLY': return '#ec4899';
      default: return 'var(--text-secondary)';
    }
  }};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: var(--gradient-primary);
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 0 8px var(--button-primary-glow);
`;

const MutedBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-primary);
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' | 'muted' }>`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: var(--gradient-primary);
          color: white;
          box-shadow: 0 0 12px var(--button-primary-glow);
          &:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 0 20px var(--button-primary-glow);
          }
        `;
      case 'secondary':
        return `
          background: var(--bg-tertiary);
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary);
          &:hover:not(:disabled) {
            background: var(--bg-elevated);
            box-shadow: 0 0 12px rgba(91, 127, 255, 0.3);
          }
        `;
      case 'danger':
        return `
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
          &:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
          }
        `;
      case 'muted':
        return `
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
          &:hover:not(:disabled) {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border-color: var(--accent-primary);
          }
        `;
      default:
        return `
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
          &:hover:not(:disabled) {
            background: var(--bg-elevated);
            color: var(--text-primary);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ComposerSection = styled.div`
  margin-bottom: 24px;
`;

const ComposerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary);
`;

const FeedSection = styled.div`
  margin-top: 24px;
`;

const FeedHeader = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-primary);
`;

const PostList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  font-size: 16px;
  color: var(--text-secondary);
`;

const ErrorState = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--border-radius-md);
  padding: 20px;
  color: #ef4444;
  text-align: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
`;

const EmptyStateTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
`;

const EmptyStateText = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-top: 16px;

  &:hover:not(:disabled) {
    background: var(--bg-elevated);
    box-shadow: 0 0 12px rgba(91, 127, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: #22c55e;
  margin-bottom: 16px;
  font-size: 14px;
`;

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  useAuth(); // Ensure user is authenticated
  const {
    getGroupById,
    joinGroup,
    leaveGroup,
    muteGroup,
    unmuteGroup,
    deleteGroup,
    isMember,
    isCreator,
    refreshGroups,
  } = useGroup();

  // Group state
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Membership state
  const [isMemberOfGroup, setIsMemberOfGroup] = useState(false);
  const [isCreatorOfGroup, setIsCreatorOfGroup] = useState(false);

  // Load group details
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId) return;

      try {
        setLoading(true);
        setError(null);

        const groupData = await getGroupById(groupId);
        setGroup(groupData);

        // Check membership status
        const memberStatus = await isMember(groupId);
        setIsMemberOfGroup(memberStatus);

        const creatorStatus = await isCreator(groupId);
        setIsCreatorOfGroup(creatorStatus);
      } catch (err: any) {
        console.error('Error loading group:', err);
        setError(err.message || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId, getGroupById, isMember, isCreator]);

  // Load group feed
  const loadFeed = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!groupId) return;

    try {
      setFeedLoading(true);
      setFeedError(null);

      const response = await getGroupFeed(groupId, pageNum, 20);

      if (append) {
        setPosts(prev => [...prev, ...response.content]);
      } else {
        setPosts(response.content);
      }

      setHasMore(!response.last);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Error loading feed:', err);
      setFeedError(err.message || 'Failed to load posts');
    } finally {
      setFeedLoading(false);
    }
  }, [groupId]);

  // Initial feed load
  useEffect(() => {
    if (groupId && !loading && !error) {
      loadFeed(0);
    }
  }, [groupId, loading, error, loadFeed]);

  // Handle post created - refresh feed
  const handlePostCreated = useCallback(() => {
    loadFeed(0);
    setSuccessMessage('Post created successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [loadFeed]);

  // Handle join group
  const handleJoinGroup = async () => {
    if (!groupId || !group) return;

    try {
      setActionLoading(true);
      await joinGroup(groupId);
      setIsMemberOfGroup(true);
      setSuccessMessage(`You've joined ${group.name}!`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh group data to get updated member count
      const updatedGroup = await getGroupById(groupId);
      setGroup(updatedGroup);
      await refreshGroups();
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    if (!groupId || !group) return;

    if (!window.confirm(`Are you sure you want to leave ${group.name}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await leaveGroup(groupId);
      setIsMemberOfGroup(false);
      setSuccessMessage(`You've left ${group.name}.`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh group data
      const updatedGroup = await getGroupById(groupId);
      setGroup(updatedGroup);
      await refreshGroups();
    } catch (err: any) {
      setError(err.message || 'Failed to leave group');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle mute/unmute
  const handleToggleMute = async () => {
    if (!groupId || !group) return;

    try {
      setActionLoading(true);
      if (group.isMuted) {
        await unmuteGroup(groupId);
        setGroup(prev => prev ? { ...prev, isMuted: false } : null);
        setSuccessMessage(`Unmuted ${group.name}. Posts will appear in your feed.`);
      } else {
        await muteGroup(groupId);
        setGroup(prev => prev ? { ...prev, isMuted: true } : null);
        setSuccessMessage(`Muted ${group.name}. Posts won't appear in your feed.`);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
      await refreshGroups();
    } catch (err: any) {
      setError(err.message || 'Failed to update mute status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!groupId || !group) return;

    if (!window.confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await deleteGroup(groupId);
      await refreshGroups();
      navigate('/groups');
    } catch (err: any) {
      setError(err.message || 'Failed to delete group');
      setActionLoading(false);
    }
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!feedLoading && hasMore) {
      loadFeed(page + 1, true);
    }
  };

  // Get visibility label
  const getVisibilityLabel = (visibility: string): string => {
    switch (visibility) {
      case 'PUBLIC': return 'Public';
      case 'ORG_PRIVATE': return 'Organization Private';
      case 'CROSS_ORG': return 'Cross-Organization';
      case 'INVITE_ONLY': return 'Invite Only';
      default: return visibility;
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState>Loading group...</LoadingState>
      </PageContainer>
    );
  }

  if (error || !group) {
    return (
      <PageContainer>
        <BackButton onClick={() => navigate(-1)}>
          ← Back
        </BackButton>
        <ErrorState>
          {error || 'Group not found'}
        </ErrorState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HeaderSection>
        <BackButton onClick={() => navigate(-1)}>
          ← Back
        </BackButton>

        <GroupHeader>
          {group.imageUrl && (
            <GroupImageContainer>
              <GroupImage src={group.imageUrl} alt={group.name} />
            </GroupImageContainer>
          )}
          <GroupTitle>
            {group.name}
            {group.userRole && (
              <RoleBadge>
                {group.userRole.charAt(0) + group.userRole.slice(1).toLowerCase()}
              </RoleBadge>
            )}
            {group.isMuted && <MutedBadge>Muted</MutedBadge>}
          </GroupTitle>

          {group.description && (
            <GroupDescription>{group.description}</GroupDescription>
          )}

          <GroupMeta>
            <MetaItem>
              <VisibilityBadge visibility={group.visibility}>
                {getVisibilityLabel(group.visibility)}
              </VisibilityBadge>
            </MetaItem>
            <MetaItem>
              <span>👥</span>
              <span>{group.memberCount || 0} members</span>
            </MetaItem>
            {group.organizationName && (
              <MetaItem>
                <span>🏛️</span>
                <span>{group.organizationName}</span>
              </MetaItem>
            )}
            {(group.createdByUserName || group.creatorName) && (
              <MetaItem>
                <span>👤</span>
                <span>Created by{' '}
                  {(group.createdByUserId || group.creatorId) ? (
                    <CreatorLink
                      onClick={() => navigate(`/profile/${group.createdByUserId || group.creatorId}`)}
                    >
                      {group.createdByUserName || group.creatorName}
                    </CreatorLink>
                  ) : (
                    group.createdByUserName || group.creatorName
                  )}
                </span>
              </MetaItem>
            )}
          </GroupMeta>

          <ActionButtons>
            {isMemberOfGroup ? (
              <>
                <ActionButton
                  variant={group.isMuted ? 'primary' : 'muted'}
                  onClick={handleToggleMute}
                  disabled={actionLoading}
                >
                  {actionLoading ? '...' : group.isMuted ? 'Unmute' : 'Mute'}
                </ActionButton>
                {isCreatorOfGroup && (
                  <ActionButton
                    variant="secondary"
                    onClick={() => navigate(`/groups/${groupId}/settings`)}
                    disabled={actionLoading}
                  >
                    Edit Group
                  </ActionButton>
                )}
                {isCreatorOfGroup ? (
                  <ActionButton
                    variant="danger"
                    onClick={handleDeleteGroup}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Deleting...' : 'Delete Group'}
                  </ActionButton>
                ) : (
                  <ActionButton
                    variant="danger"
                    onClick={handleLeaveGroup}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Leaving...' : 'Leave Group'}
                  </ActionButton>
                )}
              </>
            ) : (
              <ActionButton
                variant="primary"
                onClick={handleJoinGroup}
                disabled={actionLoading}
              >
                {actionLoading ? 'Joining...' : 'Join Group'}
              </ActionButton>
            )}
          </ActionButtons>
        </GroupHeader>
      </HeaderSection>

      {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}

      {/* Post Composer - only show for members */}
      {isMemberOfGroup && (
        <ComposerSection>
          <ComposerHeader>
            <span>📝</span>
            <span>Create a post in {group.name}</span>
          </ComposerHeader>
          <PostComposer
            onPostCreated={handlePostCreated}
            defaultGroupId={groupId}
          />
        </ComposerSection>
      )}

      {/* Feed Section */}
      <FeedSection>
        <FeedHeader>Posts in {group.name}</FeedHeader>

        {feedError && <ErrorState>{feedError}</ErrorState>}

        {!feedLoading && posts.length === 0 && !feedError && (
          <EmptyState>
            <EmptyStateTitle>No posts yet</EmptyStateTitle>
            <EmptyStateText>
              {isMemberOfGroup
                ? 'Be the first to post something!'
                : 'Join the group to see and create posts.'}
            </EmptyStateText>
          </EmptyState>
        )}

        <PostList>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onPostUpdate={() => loadFeed(0)}
              onPostDelete={() => loadFeed(0)}
            />
          ))}
        </PostList>

        {feedLoading && (
          <LoadingState>Loading posts...</LoadingState>
        )}

        {!feedLoading && hasMore && posts.length > 0 && (
          <LoadMoreButton onClick={handleLoadMore}>
            Load More Posts
          </LoadMoreButton>
        )}
      </FeedSection>
    </PageContainer>
  );
};

export default GroupPage;
