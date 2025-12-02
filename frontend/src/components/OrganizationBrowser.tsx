import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization, Organization } from '../contexts/OrganizationContext';
import organizationGroupApi, { OrganizationGroup } from '../services/organizationGroupApi';
import styled from 'styled-components';
import '../App.css';

const BrowserContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const HeaderSection = styled.div`
  margin-bottom: 30px;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  margin-top: 8px;
`;

const SearchBarContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
`;

const SearchBar = styled.input`
  flex: 1;
  padding: 12px 20px;
  font-size: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  transition: all var(--transition-base);

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2),
                0 0 20px var(--button-primary-glow);
    background: var(--bg-elevated);
  }

  &::placeholder {
    color: var(--text-disabled);
  }
`;

const EmojiPickerButton = styled.button`
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-secondary);
  transition: all var(--transition-base);
  flex-shrink: 0;

  &:hover {
    background: var(--bg-elevated);
    border-color: var(--border-glow);
    color: var(--text-primary);
    box-shadow: 0 0 8px var(--button-primary-glow);
    transform: scale(1.1);
  }
`;

const EmojiPickerDropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 3000;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 4px;
  animation: slideDown 0.2s ease;
`;

const EmojiPickerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 1;
`;

const EmojiPickerHeaderText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
`;

const EmojiPickerClose = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }
`;

const EmojiPickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 8px;
  padding: 16px;
`;

const EmojiPickerItem = styled.button`
  padding: 12px;
  font-size: 24px;
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--bg-elevated);
    border-color: var(--accent-primary);
    transform: scale(1.1);
    box-shadow: 0 0 12px var(--button-primary-glow);
  }
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const FilterTab = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid ${props => props.active ? 'var(--accent-primary)' : 'var(--border-primary)'};
  background: ${props => props.active ? 'var(--gradient-primary)' : 'var(--bg-tertiary)'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};
  border-radius: var(--border-radius-pill);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: ${props => props.active ? '0 2px 8px var(--button-primary-glow)' : 'none'};

  &:hover {
    border-color: var(--accent-primary);
    background: ${props => props.active ? 'var(--gradient-primary)' : 'var(--bg-elevated)'};
    transform: translateY(-1px);
  }
`;

const MyMembershipsSection = styled.div`
  margin-bottom: 40px;
  padding: 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 15px;
`;

const MembershipCard = styled.div`
  background: var(--bg-elevated);
  padding: 16px;
  border-radius: var(--border-radius-md);
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border-primary);
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--border-glow);
    box-shadow: var(--shadow-sm);
  }
`;

const MembershipInfo = styled.div`
  flex: 1;
`;

const MembershipName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MembershipRole = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
`;

const PrimaryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: var(--gradient-primary);
  color: white;
  border-radius: var(--border-radius-pill);
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px var(--button-primary-glow);
`;

const SecondaryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-pill);
  font-size: 12px;
  font-weight: 600;
`;

const OrganizationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const OrganizationCard = styled.div`
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-lg);
  padding: 20px;
  transition: all var(--transition-base);
  cursor: pointer;
  box-shadow: var(--shadow-sm);

  &:hover {
    border-color: var(--accent-primary);
    box-shadow: var(--shadow-md), var(--glow-blue);
    transform: translateY(-2px);
  }
`;

const OrgName = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
`;

const OrgType = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
`;

const OrgStats = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text-secondary);
`;

const OrgStat = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' | 'outline' }>`
  flex: 1;
  padding: 10px 16px;
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
          box-shadow: 0 2px 8px var(--button-primary-glow);
          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px var(--button-primary-glow);
          }
          &:disabled {
            background: var(--bg-secondary);
            color: var(--text-disabled);
            cursor: not-allowed;
            box-shadow: none;
          }
        `;
      case 'secondary':
        return `
          background: transparent;
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary);
          &:hover {
            background: var(--button-secondary-hover);
            border-color: var(--accent-primary-light);
          }
          &:disabled {
            border-color: var(--border-primary);
            color: var(--text-disabled);
            cursor: not-allowed;
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border-primary);
          &:hover:not(:disabled) {
            background: var(--bg-elevated);
            border-color: var(--accent-primary);
            color: var(--accent-primary);
          }
          &:disabled {
            border-color: var(--border-primary);
            color: var(--text-disabled);
            cursor: not-allowed;
            opacity: 0.6;
          }
        `;
      case 'danger':
        return `
          background: var(--error);
          color: white;
          &:hover {
            background: #dc2626;
            box-shadow: 0 0 20px var(--error-glow);
          }
        `;
      default:
        return `
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
          &:hover {
            background: var(--bg-elevated);
          }
        `;
    }
  }}
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  font-size: 16px;
  color: var(--text-secondary);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
`;

const EmptyStateTitle = styled.div`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
`;

const EmptyStateText = styled.div`
  font-size: 16px;
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--error);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: var(--error);
  margin-top: 12px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid var(--success);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: var(--success);
  margin-top: 12px;
  font-size: 14px;
`;

const CooldownWarning = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid var(--warning);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: var(--warning);
  margin-top: 12px;
  font-size: 14px;
`;

type OrgTypeFilter = 'ALL' | 'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'FAMILY' | 'GENERAL';

const OrganizationBrowser: React.FC = () => {
  const navigate = useNavigate();
  const {
    primaryMembership,
    secondaryMemberships,
    allMemberships,
    churchPrimary,
    familyPrimary,
    loading: contextLoading,
    joinOrganization,
    leaveOrganization,
    setChurchPrimary,
    setFamilyPrimary,
    joinAsGroup,
    canBeChurchPrimary,
    canBeFamilyPrimary,
    canSwitchPrimary,
    getDaysUntilCanSwitch,
    searchOrganizations,
  } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<OrgTypeFilter>('ALL');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(true);
  const [daysUntilSwitch, setDaysUntilSwitch] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [followedAsGroups, setFollowedAsGroups] = useState<Set<string>>(new Set());
  const [checkingFollowedOrgs, setCheckingFollowedOrgs] = useState(true);
  const [followedOrgGroups, setFollowedOrgGroups] = useState<OrganizationGroup[]>([]);
  const [loadingFollowedOrgs, setLoadingFollowedOrgs] = useState(false);

  // Same curated list of family-friendly emojis from FamilyGroupCreateForm
  const familyEmojis = [
    '❤️', '💚', '💛', '💙', '🧡', '💜', '🖤', '🤍', '💕', '💖',
    '🍌', '🍎', '🍊', '🍓', '🍉', '🥭', '🍑', '🍒', '🍇', '🥝',
    '🐵', '🐶', '🐱', '🐰', '🐻', '🐨', '🦊', '🐯', '🦁', '🐮',
    '🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '☁️', '🌺', '🌻',
    '🏠', '💒', '🎂', '🎉', '🎈', '🎁', '🕯️', '🦋', '🐝', '🌿'
  ];

  // Handle emoji click - add emoji to search query
  const handleEmojiClick = (emoji: string) => {
    setSearchQuery(prev => prev + emoji);
    setShowEmojiPicker(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

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

  // Check if user can switch primary org
  useEffect(() => {
    const checkSwitchEligibility = async () => {
      try {
        const eligible = await canSwitchPrimary();
        setCanSwitch(eligible);
        if (!eligible) {
          const days = await getDaysUntilCanSwitch();
          setDaysUntilSwitch(days);
        }
      } catch (err) {
        console.error('Error checking switch eligibility:', err);
      }
    };

    checkSwitchEligibility();
  }, [canSwitchPrimary, getDaysUntilCanSwitch]);

  // Check which organizations are followed as groups
  useEffect(() => {
    const checkFollowedOrgs = async () => {
      try {
        setCheckingFollowedOrgs(true);
        setLoadingFollowedOrgs(true);
        const orgGroups = await organizationGroupApi.getFollowedOrganizations();
        const orgIds = new Set(orgGroups.map(og => og.organization.id));
        setFollowedAsGroups(orgIds);
        setFollowedOrgGroups(orgGroups);
      } catch (err) {
        console.error('Error checking followed orgs:', err);
      } finally {
        setCheckingFollowedOrgs(false);
        setLoadingFollowedOrgs(false);
      }
    };
    checkFollowedOrgs();
  }, []);

  // Search organizations when query or filter changes
  useEffect(() => {
    const performSearch = async () => {
      try {
        setSearchLoading(true);
        setError(null);

        const query = searchQuery.trim() || '*'; // Use wildcard for empty search
        const result = await searchOrganizations(query, 0, 50);

        // Filter by type if not ALL
        let filtered = result.content;
        if (typeFilter !== 'ALL') {
          filtered = filtered.filter(org => org.type === typeFilter);
        }

        setOrganizations(filtered);
      } catch (err: any) {
        setError(err.message || 'Failed to search organizations');
        setOrganizations([]);
      } finally {
        setSearchLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, typeFilter, searchOrganizations]);

  const handleJoinAsPrimary = async (orgId: string, orgName: string, orgType?: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      // Find the organization to get its type if not provided
      let organizationType = orgType;
      if (!organizationType) {
        const org = organizations.find(o => o.id === orgId);
        organizationType = org?.type;
      }

      // Route to the appropriate dual primary method based on organization type
      if (organizationType && canBeFamilyPrimary(organizationType)) {
        // FAMILY type organizations go to Family Primary slot
        console.log('🏠 Setting Family Primary:', orgName, '(type:', organizationType, ')');
        await setFamilyPrimary(orgId);
        setSuccess(`Successfully set ${orgName} as your Family Primary!`);
      } else if (organizationType && canBeChurchPrimary(organizationType)) {
        // CHURCH, MINISTRY, NONPROFIT, GENERAL types go to Church Primary slot
        console.log('⛪ Setting Church Primary:', orgName, '(type:', organizationType, ')');
        await setChurchPrimary(orgId);
        setSuccess(`Successfully set ${orgName} as your Church Primary!`);
      } else {
        // Fallback to legacy method if type is unknown
        console.warn('⚠️ Unknown organization type, using legacy joinOrganization method');
        await joinOrganization(orgId, true);
        setSuccess(`Successfully joined ${orgName} as your primary organization!`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinAsSecondary = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      // Use joinAsGroup for secondary memberships (social feed only access)
      await joinAsGroup(orgId);
      setSuccess(`Successfully joined ${orgName} as a group (you'll see their posts in your feed)!`);
    } catch (err: any) {
      setError(err.message || 'Failed to join organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      if (window.confirm(`Are you sure you want to leave ${orgName}?`)) {
        await leaveOrganization(orgId);
        setSuccess(`Successfully left ${orgName}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to leave organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeeGroupPosts = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      // Validation: Check if this is user's own primary organization
      if (isPrimary(orgId)) {
        setError(`You cannot follow your own primary organization as a group. You already see all posts from ${orgName}.`);
        return;
      }

      // Check if already following
      if (followedAsGroups.has(orgId)) {
        setError(`You are already following ${orgName} as a group.`);
        return;
      }

      // Check if user can follow (backend will also validate)
      const canFollow = await organizationGroupApi.canFollowAsGroup(orgId);
      if (!canFollow) {
        setError(`You cannot follow ${orgName} as a group.`);
        return;
      }

      await organizationGroupApi.followOrganizationAsGroup(orgId);
      setFollowedAsGroups(prev => new Set(prev).add(orgId));
      // Refresh the full list
      const orgGroups = await organizationGroupApi.getFollowedOrganizations();
      setFollowedOrgGroups(orgGroups);
      setSuccess(`Now following ${orgName}! You'll see their posts in your feed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to follow organization as group');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollowOrgGroup = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      if (window.confirm(`Are you sure you want to stop following ${orgName}? You will no longer see their posts in your feed.`)) {
        await organizationGroupApi.unfollowOrganizationAsGroup(orgId);
        setFollowedAsGroups(prev => {
          const newSet = new Set(prev);
          newSet.delete(orgId);
          return newSet;
        });
        // Refresh the full list
        const orgGroups = await organizationGroupApi.getFollowedOrganizations();
        setFollowedOrgGroups(orgGroups);
        setSuccess(`Stopped following ${orgName}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unfollow organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMuteOrgGroup = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      await organizationGroupApi.muteOrganizationAsGroup(orgId);
      // Refresh the full list
      const orgGroups = await organizationGroupApi.getFollowedOrganizations();
      setFollowedOrgGroups(orgGroups);
      setFollowedAsGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(orgId); // Remove from unmuted set
        return newSet;
      });
      setSuccess(`Muted ${orgName}. You will no longer see posts from this organization in your feed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to mute organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnmuteOrgGroup = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      await organizationGroupApi.unmuteOrganizationAsGroup(orgId);
      // Refresh the full list
      const orgGroups = await organizationGroupApi.getFollowedOrganizations();
      setFollowedOrgGroups(orgGroups);
      setFollowedAsGroups(prev => new Set(prev).add(orgId)); // Add back to unmuted set
      setSuccess(`Unmuted ${orgName}. You will now see posts from this organization in your feed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to unmute organization');
    } finally {
      setActionLoading(null);
    }
  };

  const isMember = (orgId: string): boolean => {
    return allMemberships.some(m => m.organizationId === orgId);
  };

  const isPrimary = (orgId: string): boolean => {
    return churchPrimary?.organizationId === orgId || familyPrimary?.organizationId === orgId;
  };

  const isSecondary = (orgId: string): boolean => {
    return secondaryMemberships.some(m => m.organizationId === orgId);
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'CHURCH': return 'Church';
      case 'MINISTRY': return 'Ministry';
      case 'NONPROFIT': return 'Nonprofit';
      case 'FAMILY': return 'Family';
      case 'GENERAL': return 'General';
      case 'GLOBAL': return 'Global Organization';
      default: return type;
    }
  };

  if (contextLoading) {
    return <LoadingSpinner>Loading your memberships...</LoadingSpinner>;
  }

  return (
    <BrowserContainer>
      <HeaderSection>
        <HeaderTop>
          <button
            className="back-home-button"
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            🏠 Back Home
          </button>
          <Title>Discover Organizations</Title>
        </HeaderTop>
        <Subtitle>
          Find and join churches, ministries, nonprofits, and families in your community
        </Subtitle>

        <SearchBarContainer>
          <SearchBar
            ref={searchInputRef}
            type="text"
            placeholder="Search organizations by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {/* Emoji Picker Button */}
          <EmojiPickerButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              console.log('😀 Emoji picker button clicked! showEmojiPicker:', showEmojiPicker);
              setShowEmojiPicker(!showEmojiPicker);
            }}
            aria-label="Open emoji picker"
            title="Add emoji to search"
          >
            😀
          </EmojiPickerButton>
          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <EmojiPickerDropdown ref={emojiPickerRef}>
              <EmojiPickerHeader>
                <EmojiPickerHeaderText>Select Emoji</EmojiPickerHeaderText>
                <EmojiPickerClose
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(false);
                  }}
                  aria-label="Close emoji picker"
                >
                  ✕
                </EmojiPickerClose>
              </EmojiPickerHeader>
              <EmojiPickerGrid>
                {familyEmojis.map((emoji, index) => (
                  <EmojiPickerItem
                    key={index}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEmojiClick(emoji);
                    }}
                    title={`Add ${emoji}`}
                  >
                    {emoji}
                  </EmojiPickerItem>
                ))}
              </EmojiPickerGrid>
            </EmojiPickerDropdown>
          )}
        </SearchBarContainer>

        <FilterTabs>
          <FilterTab
            active={typeFilter === 'ALL'}
            onClick={() => setTypeFilter('ALL')}
          >
            All Organizations
          </FilterTab>
          <FilterTab
            active={typeFilter === 'CHURCH'}
            onClick={() => setTypeFilter('CHURCH')}
          >
            Churches
          </FilterTab>
          <FilterTab
            active={typeFilter === 'MINISTRY'}
            onClick={() => setTypeFilter('MINISTRY')}
          >
            Ministries
          </FilterTab>
          <FilterTab
            active={typeFilter === 'NONPROFIT'}
            onClick={() => setTypeFilter('NONPROFIT')}
          >
            Nonprofits
          </FilterTab>
          <FilterTab
            active={typeFilter === 'FAMILY'}
            onClick={() => setTypeFilter('FAMILY')}
          >
            Families
          </FilterTab>
          <FilterTab
            active={typeFilter === 'GENERAL'}
            onClick={() => setTypeFilter('GENERAL')}
          >
            General
          </FilterTab>
        </FilterTabs>
      </HeaderSection>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {!canSwitch && primaryMembership && (
        <CooldownWarning>
          You can switch your primary organization again in {daysUntilSwitch} days.
        </CooldownWarning>
      )}

      {allMemberships.length > 0 && (
        <MyMembershipsSection>
          <SectionTitle>My Organizations</SectionTitle>
          {churchPrimary && (
            <MembershipCard>
              <MembershipInfo>
                <MembershipName>
                  {churchPrimary.organizationName}
                  <PrimaryBadge>CHURCH PRIMARY</PrimaryBadge>
                </MembershipName>
                <MembershipRole>
                  {churchPrimary.role.toLowerCase().charAt(0).toUpperCase() +
                   churchPrimary.role.toLowerCase().slice(1)} •
                  Joined {new Date(churchPrimary.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
              <Button
                variant="danger"
                onClick={() => handleLeave(churchPrimary.organizationId, churchPrimary.organizationName || 'this organization')}
                disabled={actionLoading === churchPrimary.organizationId}
              >
                {actionLoading === churchPrimary.organizationId ? 'Leaving...' : 'Leave'}
              </Button>
            </MembershipCard>
          )}
          {familyPrimary && (
            <MembershipCard>
              <MembershipInfo>
                <MembershipName>
                  {familyPrimary.organizationName}
                  <PrimaryBadge>FAMILY PRIMARY</PrimaryBadge>
                </MembershipName>
                <MembershipRole>
                  {familyPrimary.role.toLowerCase().charAt(0).toUpperCase() +
                   familyPrimary.role.toLowerCase().slice(1)} •
                  Joined {new Date(familyPrimary.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
              <Button
                variant="danger"
                onClick={() => handleLeave(familyPrimary.organizationId, familyPrimary.organizationName || 'this organization')}
                disabled={actionLoading === familyPrimary.organizationId}
              >
                {actionLoading === familyPrimary.organizationId ? 'Leaving...' : 'Leave'}
              </Button>
            </MembershipCard>
          )}
          {secondaryMemberships.map(membership => (
            <MembershipCard key={membership.id}>
              <MembershipInfo>
                <MembershipName>
                  {membership.organizationName}
                  <SecondaryBadge>SECONDARY</SecondaryBadge>
                </MembershipName>
                <MembershipRole>
                  {membership.role.toLowerCase().charAt(0).toUpperCase() +
                   membership.role.toLowerCase().slice(1)} •
                  Joined {new Date(membership.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
              <Button
                variant="danger"
                onClick={() => handleLeave(membership.organizationId, membership.organizationName || 'this organization')}
                disabled={actionLoading === membership.organizationId}
              >
                {actionLoading === membership.organizationId ? 'Leaving...' : 'Leave'}
              </Button>
            </MembershipCard>
          ))}
        </MyMembershipsSection>
      )}

      {followedOrgGroups.length > 0 && (
        <MyMembershipsSection>
          <SectionTitle>Organizations I'm Following</SectionTitle>
          {followedOrgGroups.map(orgGroup => (
            <MembershipCard key={orgGroup.id}>
              <MembershipInfo>
                <MembershipName>
                  {orgGroup.organization.name}
                  <SecondaryBadge>
                    {orgGroup.isMuted ? 'MUTED' : 'FOLLOWING AS GROUP'}
                  </SecondaryBadge>
                </MembershipName>
                <MembershipRole>
                  {getTypeLabel(orgGroup.organization.type)} • 
                  Following since {new Date(orgGroup.joinedAt).toLocaleDateString()}
                  {orgGroup.isMuted && ' • Muted'}
                </MembershipRole>
              </MembershipInfo>
              <ButtonGroup>
                {orgGroup.isMuted ? (
                  <Button
                    variant="primary"
                    onClick={() => handleUnmuteOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                    disabled={actionLoading === orgGroup.organization.id}
                  >
                    {actionLoading === orgGroup.organization.id ? 'Unmuting...' : 'Unmute'}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handleMuteOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                    disabled={actionLoading === orgGroup.organization.id}
                  >
                    {actionLoading === orgGroup.organization.id ? 'Muting...' : 'Mute'}
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => handleUnfollowOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                  disabled={actionLoading === orgGroup.organization.id}
                >
                  {actionLoading === orgGroup.organization.id ? 'Unfollowing...' : 'Unfollow'}
                </Button>
              </ButtonGroup>
            </MembershipCard>
          ))}
        </MyMembershipsSection>
      )}

      <SectionTitle>
        {searchQuery ? `Search Results for "${searchQuery}"` : 'All Organizations'}
      </SectionTitle>

      {searchLoading ? (
        <LoadingSpinner>Searching...</LoadingSpinner>
      ) : organizations.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No organizations found</EmptyStateTitle>
          <EmptyStateText>
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Be the first to create an organization!'}
          </EmptyStateText>
        </EmptyState>
      ) : (
        <OrganizationGrid>
          {organizations.map(org => (
            <OrganizationCard key={org.id}>
              <OrgName>{org.name}</OrgName>
              <OrgType>{getTypeLabel(org.type)}</OrgType>
              <OrgStats>
                <OrgStat>
                  <span>👥</span>
                  <span>{org.memberCount || 0} members</span>
                </OrgStat>
                <OrgStat>
                  <span>📊</span>
                  <span>{org.tier}</span>
                </OrgStat>
              </OrgStats>

              {isMember(org.id) ? (
                <ButtonGroup>
                  {isPrimary(org.id) ? (
                    <Button disabled>
                      {churchPrimary?.organizationId === org.id 
                        ? 'Your Church Primary' 
                        : familyPrimary?.organizationId === org.id
                        ? 'Your Family Primary'
                        : 'Your Primary Organization'}
                    </Button>
                  ) : isSecondary(org.id) ? (
                    <>
                      <Button disabled>Secondary Member</Button>
                      <Button
                        variant="danger"
                        onClick={() => handleLeave(org.id, org.name)}
                        disabled={actionLoading === org.id}
                      >
                        Leave
                      </Button>
                    </>
                  ) : (
                    <Button disabled>Member</Button>
                  )}
                </ButtonGroup>
              ) : (
                <ButtonGroup>
                  <Button
                    variant="primary"
                    onClick={() => handleJoinAsPrimary(org.id, org.name, org.type)}
                    disabled={actionLoading === org.id}
                    title={
                      canBeFamilyPrimary(org.type)
                        ? 'Set as your Family Primary organization'
                        : canBeChurchPrimary(org.type)
                        ? 'Set as your Church Primary organization'
                        : 'Join as your primary organization for full access'
                    }
                  >
                    {actionLoading === org.id 
                      ? 'Joining...' 
                      : canBeFamilyPrimary(org.type)
                      ? 'Set as Family Primary'
                      : canBeChurchPrimary(org.type)
                      ? 'Set as Church Primary'
                      : 'Join as Primary'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleJoinAsSecondary(org.id, org.name)}
                    disabled={actionLoading === org.id}
                    title="Join as secondary to see public posts in your feed"
                  >
                    {actionLoading === org.id ? 'Joining...' : 'Join as Secondary'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSeeGroupPosts(org.id, org.name)}
                    disabled={actionLoading === org.id || followedAsGroups.has(org.id) || isPrimary(org.id)}
                    title={
                      isPrimary(org.id)
                        ? 'You already see all posts from your primary organization'
                        : followedAsGroups.has(org.id)
                        ? 'Already following this organization as a group'
                        : 'Follow this organization to see their posts in your feed (feed-only, no quick actions)'
                    }
                  >
                    {actionLoading === org.id
                      ? 'Following...'
                      : followedAsGroups.has(org.id)
                      ? 'Following as Group'
                      : 'See Group Posts'}
                  </Button>
                </ButtonGroup>
              )}
            </OrganizationCard>
          ))}
        </OrganizationGrid>
      )}
    </BrowserContainer>
  );
};

export default OrganizationBrowser;
