import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrganization, Organization } from '../contexts/OrganizationContext';
import organizationGroupApi, { OrganizationGroup } from '../services/organizationGroupApi';
import CreateOrganizationModal from './CreateOrganizationModal';
import FamilyGroupCreateForm from './FamilyGroupCreateForm';
import FamilyInviteShareModal from './FamilyInviteShareModal';
import NearbyChurchFinder from './NearbyChurchFinder';
import { extractFamilyInviteCode } from '../services/organizationInviteApi';
import styled from 'styled-components';
import '../App.css';

/**
 * Optional `?focus=church|family` query param (set by the Dashboard WelcomeJoinCard).
 * Narrows the browse list and adapts copy so a brand-new user isn't staring at
 * churches and families mixed together. Absent param = original behaviour.
 */
type BrowserFocus = 'church' | 'family' | null;

const CHURCH_FOCUS_TYPES = ['CHURCH', 'MINISTRY', 'NONPROFIT'];

/**
 * Families are private: they are never listed in the browse grid (invite-link first).
 * Name/emoji search still finds them so a relative who knows the emoji can get in.
 */
const isBrowsableType = (type: string) => type !== 'FAMILY';

const parseFocus = (raw: string | null): BrowserFocus => {
  if (raw === 'church' || raw === 'family') return raw;
  return null;
};

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

const CreateButton = styled.button`
  margin-left: auto;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 0 12px var(--button-primary-glow);

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 0 20px var(--button-primary-glow);
  }
`;

/* Focus-mode helpers (only rendered when ?focus=church|family is present) */
const FocusHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(74, 144, 226, 0.1);
  border: 1px solid rgba(74, 144, 226, 0.35);
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-primary);
`;

const FocusHintText = styled.span`
  flex: 1 1 220px;
  min-width: 0;
`;

const FocusHintButton = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }
`;

const FocusClearLink = styled.button`
  border: none;
  background: none;
  color: #4a90e2;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;

  &:hover {
    text-decoration: underline;
  }
`;

const FamilyModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
`;

const FamilyModalContent = styled.div`
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  background: var(--bg-primary);
`;

/* Invite-first family join panel (replaces the browse grid when ?focus=family) */
const FamilyJoinPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
  border-radius: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
`;

const FamilyJoinTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
`;

const FamilyJoinText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
`;

const FamilyJoinRow = styled.form`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FamilyJoinInput = styled.input`
  flex: 1 1 220px;
  min-width: 0;
  padding: 11px 14px;
  border-radius: 24px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #4a90e2);
  }
`;

const FamilyJoinButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 11px 18px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  border: ${p => (p.$variant === 'secondary' ? '1px solid var(--border-primary)' : 'none')};
  background: ${p => (p.$variant === 'secondary' ? 'var(--bg-primary)' : 'var(--gradient-primary)')};
  color: ${p => (p.$variant === 'secondary' ? 'var(--text-primary)' : 'white')};
  transition: all var(--transition-base);

  &:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FamilyJoinError = styled.div`
  font-size: 13px;
  color: #ef4444;
`;

const InviteFamilyButton = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 16px;
  background: var(--gradient-primary);
  color: white;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }
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
  padding: 10px 14px;
  border-radius: var(--border-radius-md);
  margin-bottom: 8px;
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-width: 0;
`;

const MembershipName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
`;

const MembershipRole = styled.div`
  font-size: 11px;
  color: var(--text-secondary);
  width: 100%;
`;

const PrimaryBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  background: var(--gradient-primary);
  color: white;
  border-radius: var(--border-radius-pill);
  font-size: 9px;
  font-weight: 600;
  box-shadow: 0 2px 8px var(--button-primary-glow);
  white-space: nowrap;
  flex-shrink: 0;
`;

const SecondaryBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-pill);
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
`;

const SmallLeaveButton = styled.button`
  padding: 3px 10px;
  font-size: 9px;
  font-weight: 600;
  background: var(--error);
  color: white;
  border: none;
  border-radius: var(--border-radius-pill);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #dc2626;
    box-shadow: 0 0 12px var(--error-glow);
  }

  &:disabled {
    background: #999;
    cursor: not-allowed;
  }
`;

const SmallActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 3px 10px;
  font-size: 9px;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-pill);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
  flex-shrink: 0;

  ${props => props.$variant === 'primary' ? `
    background: var(--gradient-primary);
    color: white;
    &:hover {
      box-shadow: 0 2px 8px var(--button-primary-glow);
    }
  ` : `
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border: 1px solid var(--border-primary);
    &:hover {
      background: var(--bg-elevated);
    }
  `}

  &:disabled {
    background: #999;
    cursor: not-allowed;
  }
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'outline' }>`
  flex: 1;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  ${props => {
    switch (props.$variant) {
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

const OrganizationBrowser: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focus: BrowserFocus = parseFocus(searchParams.get('focus'));
  const [showCreateFamilyGroup, setShowCreateFamilyGroup] = useState(false);
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
    getAllOrganizations,
    searchOrganizations,
    refreshMemberships,
  } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]); // Search results
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
  const [followedOrgGroups, setFollowedOrgGroups] = useState<OrganizationGroup[]>([]);

  // Infinite scroll state for browse mode
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]); // Full browse list
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showCreateOrganizationModal, setShowCreateOrganizationModal] = useState(false);

  // Family invite sharing (QR / link) and the "paste an invite link" box
  const [inviteShareTarget, setInviteShareTarget] = useState<{ id: string; name: string; canManage: boolean } | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteInputError, setInviteInputError] = useState<string | null>(null);

  // Browse list narrowed by ?focus. Families are never browsable (invite-first);
  // search results are intentionally left untouched so emoji search still works.
  const browseOrganizations = useMemo(() => {
    if (focus === 'church') {
      return allOrganizations.filter(org => CHURCH_FOCUS_TYPES.includes(org.type));
    }
    if (focus === 'family') {
      return [];
    }
    return allOrganizations.filter(org => isBrowsableType(org.type));
  }, [allOrganizations, focus]);

  const handleInviteInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractFamilyInviteCode(inviteInput);
    if (!code) {
      setInviteInputError('That doesn\'t look like a family invite link or code. Ask your family for the link or QR code.');
      return;
    }
    setInviteInputError(null);
    navigate(`/invite/family/${code}`);
  };

  const focusCopy = {
    title:
      focus === 'church' ? 'Find your church'
      : focus === 'family' ? 'Join your family group'
      : 'Find Organizations',
    subtitle:
      focus === 'church'
        ? 'Search for your church, ministry, or nonprofit and set it as your Church Primary to see its prayers, events, and posts.'
      : focus === 'family'
        ? 'Family groups are private. The easiest way in is an invite link or QR code from someone already in your family.'
      : 'Discover and join churches, ministries, and nonprofits in your community',
    placeholder:
      focus === 'church' ? 'Search churches by name or city...'
      : focus === 'family' ? 'Search by family name or emoji...'
      : 'Search organizations by name...',
    browseTitle:
      focus === 'church' ? 'Churches & Ministries'
      : focus === 'family' ? 'Join by invite'
      : 'All Organizations',
    emptyBrowse:
      focus === 'church' ? 'No churches found yet'
      : focus === 'family' ? 'No family groups found yet'
      : 'No organizations found',
  };

  const clearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
  };

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

  // Track if we're currently loading to prevent duplicate calls
  const isLoadingRef = useRef(false);

  // Load more organizations for infinite scroll (browse mode)
  const loadMoreOrganizations = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoadingMore(true);

    try {
      // Load everything in one request so "Find Organizations" reflects the full system list.
      const result = await getAllOrganizations(0, 1000);
      setAllOrganizations(result.content || []);
      setInitialLoadDone(true);
    } catch (err) {
      console.error('Error loading organizations:', err);
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  };

  // Initial load of organizations on mount
  useEffect(() => {
    if (!initialLoadDone && !isSearchMode) {
      loadMoreOrganizations();
    }
    // Initial browse load happens once; subsequent refreshes are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const orgGroups = await organizationGroupApi.getFollowedOrganizations();
        const orgIds = new Set(orgGroups.map(og => og.organization.id));
        setFollowedAsGroups(orgIds);
        setFollowedOrgGroups(orgGroups);
      } catch (err) {
        console.error('Error checking followed orgs:', err);
      }
    };
    checkFollowedOrgs();
  }, []);

  // Search organizations when query changes (search mode only)
  useEffect(() => {
    const query = searchQuery.trim();

    // If search is empty, switch to browse mode
    if (!query) {
      setIsSearchMode(false);
      setOrganizations([]);
      return;
    }

    // Switch to search mode and perform search
    setIsSearchMode(true);

    const performSearch = async () => {
      try {
        setSearchLoading(true);
        setError(null);

        const result = await searchOrganizations(query, 0, 50);
        setOrganizations(result.content);
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
  }, [searchQuery, searchOrganizations]);

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

  const handleOrganizationCreated = async (organization: Organization) => {
    if (organization) {
      setAllOrganizations(prev => {
        if (prev.some(org => org.id === organization.id)) {
          return prev;
        }
        return [organization, ...prev];
      });

      const normalizedQuery = searchQuery.trim().toLowerCase();
      if (normalizedQuery && organization.name?.toLowerCase().includes(normalizedQuery)) {
        setOrganizations(prev => {
          if (prev.some(org => org.id === organization.id)) {
            return prev;
          }
          return [organization, ...prev];
        });
      }
    }

    try {
      await refreshMemberships();
      setSuccess(`Successfully created ${organization?.name || 'your organization'}!`);
      setError(null);
    } catch (err) {
      // Non-blocking: creation succeeded even if membership refresh is delayed.
      console.warn('Organization created, but membership refresh failed:', err);
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
          <Title>{focusCopy.title}</Title>
          <CreateButton onClick={() => setShowCreateOrganizationModal(true)}>
            + Create Organization
          </CreateButton>
        </HeaderTop>
        <Subtitle>{focusCopy.subtitle}</Subtitle>

        <SearchBarContainer>
          <SearchBar
            ref={searchInputRef}
            type="text"
            placeholder={focusCopy.placeholder}
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

        {focus === 'family' && (
          <FocusHint>
            <FocusHintText>
              💡 Family groups can be named with emojis only - like ❤️🏠 or 🍌🐵. If you know your family's
              emoji name, use the 😀 picker above to search for it.
            </FocusHintText>
            <FocusHintButton type="button" onClick={() => setShowCreateFamilyGroup(true)}>
              👨‍👩‍👧 Create a family group
            </FocusHintButton>
            <FocusClearLink type="button" onClick={clearFocus}>
              Show all organizations
            </FocusClearLink>
          </FocusHint>
        )}

        {focus === 'church' && (
          <FocusHint>
            <FocusHintText>
              ⛪ Showing churches, ministries, and nonprofits. Not sure of the name? Use "Find churches near you"
              below. Tap "Set as Church Primary" on yours to unlock its prayers, events, and announcements.
            </FocusHintText>
            <FocusClearLink type="button" onClick={clearFocus}>
              Show all organizations
            </FocusClearLink>
          </FocusHint>
        )}

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
                <MembershipName>{churchPrimary.organizationName}</MembershipName>
                <PrimaryBadge>CHURCH PRIMARY</PrimaryBadge>
                <SmallLeaveButton
                  onClick={() => handleLeave(churchPrimary.organizationId, churchPrimary.organizationName || 'this organization')}
                  disabled={actionLoading === churchPrimary.organizationId}
                >
                  {actionLoading === churchPrimary.organizationId ? '...' : 'Leave'}
                </SmallLeaveButton>
                <MembershipRole>
                  {churchPrimary.role.toLowerCase().charAt(0).toUpperCase() +
                   churchPrimary.role.toLowerCase().slice(1)} • Joined {new Date(churchPrimary.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
            </MembershipCard>
          )}
          {familyPrimary && (
            <MembershipCard>
              <MembershipInfo>
                <MembershipName>{familyPrimary.organizationName}</MembershipName>
                <PrimaryBadge>FAMILY PRIMARY</PrimaryBadge>
                <InviteFamilyButton
                  type="button"
                  onClick={() =>
                    setInviteShareTarget({
                      id: familyPrimary.organizationId,
                      name: familyPrimary.organizationName || 'your family',
                      canManage: familyPrimary.role === 'ORG_ADMIN',
                    })
                  }
                  title="Share an invite link or QR code with your family"
                >
                  👨‍👩‍👧 Invite family
                </InviteFamilyButton>
                <SmallLeaveButton
                  onClick={() => handleLeave(familyPrimary.organizationId, familyPrimary.organizationName || 'this organization')}
                  disabled={actionLoading === familyPrimary.organizationId}
                >
                  {actionLoading === familyPrimary.organizationId ? '...' : 'Leave'}
                </SmallLeaveButton>
                <MembershipRole>
                  {familyPrimary.role.toLowerCase().charAt(0).toUpperCase() +
                   familyPrimary.role.toLowerCase().slice(1)} • Joined {new Date(familyPrimary.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
            </MembershipCard>
          )}
          {secondaryMemberships.map(membership => (
            <MembershipCard key={membership.id}>
              <MembershipInfo>
                <MembershipName>{membership.organizationName}</MembershipName>
                <SecondaryBadge>SECONDARY</SecondaryBadge>
                <SmallLeaveButton
                  onClick={() => handleLeave(membership.organizationId, membership.organizationName || 'this organization')}
                  disabled={actionLoading === membership.organizationId}
                >
                  {actionLoading === membership.organizationId ? '...' : 'Leave'}
                </SmallLeaveButton>
                <MembershipRole>
                  {membership.role.toLowerCase().charAt(0).toUpperCase() +
                   membership.role.toLowerCase().slice(1)} • Joined {new Date(membership.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
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
                <MembershipName>{orgGroup.organization.name}</MembershipName>
                <SecondaryBadge>
                  {orgGroup.isMuted ? 'MUTED' : 'FOLLOWING'}
                </SecondaryBadge>
                {orgGroup.isMuted ? (
                  <SmallActionButton
                    $variant="primary"
                    onClick={() => handleUnmuteOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                    disabled={actionLoading === orgGroup.organization.id}
                  >
                    {actionLoading === orgGroup.organization.id ? '...' : 'Unmute'}
                  </SmallActionButton>
                ) : (
                  <SmallActionButton
                    $variant="secondary"
                    onClick={() => handleMuteOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                    disabled={actionLoading === orgGroup.organization.id}
                  >
                    {actionLoading === orgGroup.organization.id ? '...' : 'Mute'}
                  </SmallActionButton>
                )}
                <SmallLeaveButton
                  onClick={() => handleUnfollowOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                  disabled={actionLoading === orgGroup.organization.id}
                >
                  {actionLoading === orgGroup.organization.id ? '...' : 'Unfollow'}
                </SmallLeaveButton>
                <MembershipRole>
                  {getTypeLabel(orgGroup.organization.type)} • Following since {new Date(orgGroup.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
            </MembershipCard>
          ))}
        </MyMembershipsSection>
      )}

      {/* 📍 Location-based discovery for people who don't know their church's exact name.
          Hidden while a name search is active and in family mode (families are invite-only). */}
      {!isSearchMode && focus !== 'family' && (
        <NearbyChurchFinder
          onJoinAsPrimary={handleJoinAsPrimary}
          onJoinAsSecondary={handleJoinAsSecondary}
          isMember={isMember}
          isPrimary={isPrimary}
          actionLoading={actionLoading}
        />
      )}

      <SectionTitle>
        {isSearchMode ? `Search Results for "${searchQuery}"` : focusCopy.browseTitle}
      </SectionTitle>

      {/* Search Mode: Show search results */}
      {isSearchMode ? (
        searchLoading ? (
          <LoadingSpinner>Searching...</LoadingSpinner>
        ) : organizations.length === 0 ? (
          <EmptyState>
            <EmptyStateTitle>No organizations found</EmptyStateTitle>
            <EmptyStateText>Try adjusting your search</EmptyStateText>
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
                          $variant="danger"
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
                      $variant="primary"
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
                      $variant="secondary"
                      onClick={() => handleJoinAsSecondary(org.id, org.name)}
                      disabled={actionLoading === org.id}
                      title="Join as secondary to see public posts in your feed"
                    >
                      {actionLoading === org.id ? 'Joining...' : 'Join as Secondary'}
                    </Button>
                    <Button
                      $variant="outline"
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
        )
      ) : (
        /* Browse Mode: Show infinite scroll list */
        <>
          {focus === 'family' ? (
            /* Invite-first: families are private, so instead of a public list we offer the
               three real ways in - paste a link, search by emoji/name, or start a new family. */
            <FamilyJoinPanel>
              <FamilyJoinTitle>🔗 Have an invite link or QR code?</FamilyJoinTitle>
              <FamilyJoinText>
                Paste the link (or just the code) your family sent you. If you were sent a QR code,
                scan it with your phone camera and it will bring you straight here.
              </FamilyJoinText>
              <FamilyJoinRow onSubmit={handleInviteInputSubmit}>
                <FamilyJoinInput
                  type="text"
                  value={inviteInput}
                  onChange={e => {
                    setInviteInput(e.target.value);
                    if (inviteInputError) setInviteInputError(null);
                  }}
                  placeholder="https://.../invite/family/AbCdEfGhIjKl"
                  aria-label="Family invite link or code"
                  autoComplete="off"
                />
                <FamilyJoinButton type="submit" disabled={!inviteInput.trim()}>
                  Continue
                </FamilyJoinButton>
              </FamilyJoinRow>
              {inviteInputError && <FamilyJoinError>{inviteInputError}</FamilyJoinError>}

              <FamilyJoinText style={{ marginTop: 6 }}>
                No link? Search your family's name or emoji in the box above, or start a new family group
                and share its invite with everyone.
              </FamilyJoinText>
              <FamilyJoinRow as="div">
                <FamilyJoinButton type="button" $variant="secondary" onClick={() => setShowCreateFamilyGroup(true)}>
                  👨‍👩‍👧 Create a family group
                </FamilyJoinButton>
                {familyPrimary && (
                  <FamilyJoinButton
                    type="button"
                    $variant="secondary"
                    onClick={() =>
                      setInviteShareTarget({
                        id: familyPrimary.organizationId,
                        name: familyPrimary.organizationName || 'your family',
                        canManage: familyPrimary.role === 'ORG_ADMIN',
                      })
                    }
                  >
                    📤 Invite to {familyPrimary.organizationName}
                  </FamilyJoinButton>
                )}
              </FamilyJoinRow>
            </FamilyJoinPanel>
          ) : !initialLoadDone ? (
            <LoadingSpinner>Loading organizations...</LoadingSpinner>
          ) : browseOrganizations.length === 0 ? (
            <EmptyState>
              <EmptyStateTitle>{focusCopy.emptyBrowse}</EmptyStateTitle>
              <EmptyStateText>Be the first to create an organization!</EmptyStateText>
            </EmptyState>
          ) : (
            <>
              <OrganizationGrid>
                {browseOrganizations.map(org => (
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
                              $variant="danger"
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
                          $variant="primary"
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
                          $variant="secondary"
                          onClick={() => handleJoinAsSecondary(org.id, org.name)}
                          disabled={actionLoading === org.id}
                          title="Join as secondary to see public posts in your feed"
                        >
                          {actionLoading === org.id ? 'Joining...' : 'Join as Secondary'}
                        </Button>
                        <Button
                          $variant="outline"
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

              <div style={{ padding: '20px', textAlign: 'center' }}>
                {loadingMore && <LoadingSpinner>Loading organizations...</LoadingSpinner>}
                {!loadingMore && browseOrganizations.length > 0 && (
                  <EmptyStateText style={{ color: 'var(--text-secondary)' }}>
                    {focus === 'church'
                      ? 'Showing all churches & ministries'
                      : 'Showing all organizations · family groups are private and join by invite'}
                  </EmptyStateText>
                )}
              </div>
            </>
          )}
        </>
      )}
      <CreateOrganizationModal
        isOpen={showCreateOrganizationModal}
        onClose={() => setShowCreateOrganizationModal(false)}
        onSuccess={handleOrganizationCreated}
      />

      {/* Family group creation - same pattern as ProfileView's modal */}
      {showCreateFamilyGroup && (
        <FamilyModalOverlay onClick={() => setShowCreateFamilyGroup(false)}>
          <FamilyModalContent onClick={(e) => e.stopPropagation()}>
            <FamilyGroupCreateForm
              onSuccess={async (org) => {
                setShowCreateFamilyGroup(false);
                await refreshMemberships();
                if (org) {
                  handleOrganizationCreated(org);
                  setSuccess(`Created ${org.name}! It's now your Family Primary - now invite everyone.`);
                  // The creator is automatically ORG_ADMIN, so go straight to sharing the invite.
                  setInviteShareTarget({ id: org.id, name: org.name, canManage: true });
                }
              }}
              onCancel={() => setShowCreateFamilyGroup(false)}
            />
          </FamilyModalContent>
        </FamilyModalOverlay>
      )}

      <FamilyInviteShareModal
        isOpen={inviteShareTarget !== null}
        organizationId={inviteShareTarget?.id || ''}
        organizationName={inviteShareTarget?.name || ''}
        canManage={inviteShareTarget?.canManage ?? false}
        onClose={() => setInviteShareTarget(null)}
      />
    </BrowserContainer>
  );
};

export default OrganizationBrowser;
