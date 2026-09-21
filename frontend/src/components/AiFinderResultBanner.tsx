import React from 'react';
import styled from 'styled-components';
import { FinderResponse } from '../services/organizationDiscoveryApi';

/**
 * ✨ Explains what the natural-language finder actually searched for.
 *
 * Sits above the search results in OrganizationBrowser. The whole point is transparency:
 * the user typed a sentence, and this shows how it was read (plus anything we had to ignore)
 * so they can correct course instead of wondering why the results look off.
 */

const Banner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(74, 144, 226, 0.12));
  border: 1px solid rgba(139, 92, 246, 0.35);
  color: var(--text-primary);
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
`;

const Interpretation = styled.div`
  flex: 1 1 240px;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
`;

const SourceBadge = styled.span<{ $ai: boolean }>`
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: white;
  background: ${p => (p.$ai ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'var(--accent-primary)')};
  white-space: nowrap;
`;

const ClearButton = styled.button`
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }
`;

const Note = styled.div`
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-secondary);
`;

const Clarification = styled.div`
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-primary);
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;

  &:hover {
    filter: brightness(1.05);
  }
`;

interface AiFinderResultBannerProps {
  result: FinderResponse;
  onClear: () => void;
  onJoinFamilyByInvite?: () => void;
}

const AiFinderResultBanner: React.FC<AiFinderResultBannerProps> = ({ result, onClear, onJoinFamilyByInvite }) => {
  const isAi = result.source === 'AI';
  const count = result.results?.length ?? 0;

  return (
    <Banner role="status" aria-live="polite" data-testid="ai-finder-banner">
      <TopRow>
        <Interpretation>
          ✨ {result.interpretation}
          {!result.familyRequested && !result.needsLocation && (
            <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
              {' '}· {count} {count === 1 ? 'result' : 'results'}
            </span>
          )}
        </Interpretation>
        <SourceBadge $ai={isAi} title={isAi ? 'Interpreted with AI' : 'Matched instantly without AI'}>
          {isAi ? 'AI' : 'Quick match'}
        </SourceBadge>
        <ClearButton type="button" onClick={onClear} aria-label="Clear smart search">
          Clear
        </ClearButton>
      </TopRow>

      {result.warnings?.map((w, i) => (
        <Note key={i}>ℹ️ {w}</Note>
      ))}

      {result.clarificationQuestion && <Clarification>💬 {result.clarificationQuestion}</Clarification>}

      {result.familyRequested && onJoinFamilyByInvite && (
        <ActionRow>
          <ActionButton type="button" onClick={onJoinFamilyByInvite}>
            👨‍👩‍👧 Join a family by invite
          </ActionButton>
        </ActionRow>
      )}
    </Banner>
  );
};

export default AiFinderResultBanner;
