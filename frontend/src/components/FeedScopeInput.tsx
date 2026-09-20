import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  useFeedFilter,
  FeedScope,
  FeedScopeParseResult,
  emptyFeedScope,
} from '../contexts/FeedFilterContext';
import { useOrganization } from '../contexts/OrganizationContext';

/**
 * FeedScopeInput - "tell the app what you want to see".
 *
 * Two front doors that produce the same FeedScope:
 *  - Quick chips (one tap, no AI): My Church, My Family, Church + Family, Friends, Nearby, Everything
 *  - Natural language: "my family and every Baptist church within 50 miles"
 *
 * Both go through the server (validate + describe) and show a preview card the
 * user confirms before anything is saved. Sits alongside the existing
 * FeedFilterSelector dropdown - it does not replace it.
 */

const Container = styled.div`
  width: 100%;
  margin: 8px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InputRow = styled.form`
  display: flex;
  gap: 8px;
  align-items: stretch;
`;

const TextInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 24px;
  font-size: 14px;
  color: #1a1a1a;
  background: white;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
  }

  &::placeholder {
    color: #8a8a8a;
  }

  @media (max-width: 480px) {
    background: var(--bg-elevated, #2a2a3e);
    border: 1px solid var(--border-primary, #3a3a4e);
    color: var(--text-primary, #fff);

    &::placeholder {
      color: var(--text-secondary, #aaa);
    }
  }
`;

const GoButton = styled.button`
  padding: 10px 16px;
  border: none;
  border-radius: 24px;
  background: #4a90e2;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, transform 0.1s;

  &:hover:not(:disabled) {
    background: #3a7bc8;
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border-radius: 16px;
  border: 1.5px solid ${p => (p.$active ? '#4a90e2' : '#dcdcdc')};
  background: ${p => (p.$active ? 'rgba(74, 144, 226, 0.12)' : 'white')};
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: #4a90e2;
    background: rgba(74, 144, 226, 0.08);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    background: ${p => (p.$active ? 'rgba(91, 127, 255, 0.25)' : 'var(--bg-elevated, #2a2a3e)')};
    border-color: ${p => (p.$active ? 'var(--border-glow, #5b7fff)' : 'var(--border-primary, #3a3a4e)')};
    color: var(--text-primary, #fff);
  }
`;

const ActiveBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(74, 144, 226, 0.1);
  border: 1px solid rgba(74, 144, 226, 0.35);
  font-size: 13px;
  color: #1a1a1a;

  @media (max-width: 480px) {
    color: var(--text-primary, #fff);
  }
`;

const BannerText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LinkButton = styled.button`
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

const PreviewCard = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  background: white;
  border: 2px solid #e0e0e0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #1a1a1a;

  @media (max-width: 480px) {
    background: var(--bg-elevated, #2a2a3e);
    border-color: var(--border-primary, #3a3a4e);
    color: var(--text-primary, #fff);
  }
`;

const PreviewTitle = styled.div`
  font-weight: 600;
`;

const PreviewDescription = styled.div`
  font-size: 15px;
`;

const WarningList = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #b26a00;
`;

const Clarification = styled.div`
  font-size: 13px;
  font-style: italic;
  color: #555;

  @media (max-width: 480px) {
    color: var(--text-secondary, #bbb);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const SecondaryButton = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  border: 1.5px solid #dcdcdc;
  background: transparent;
  color: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: #4a90e2;
  }
`;

const ErrorText = styled.div`
  font-size: 13px;
  color: #c0392b;
`;

type PendingPreview = {
  result: FeedScopeParseResult;
  sourceText?: string;
};

const PLACEHOLDERS = [
  'Try: "just my family"',
  'Try: "my church and my family"',
  'Try: "family and friends"',
  'Try: "churches within 20 miles of me"',
  'Try: "my church and Baptist churches within 100 miles"',
  'Try: "just posts by my mom, Terry Smith"',
];

const FeedScopeInput: React.FC = () => {
  const {
    activeFilter,
    scope,
    scopeDescription,
    parseScope,
    previewScope,
    saveScope,
    setFilter,
    loading: filterLoading,
  } = useFeedFilter();
  const { hasChurchPrimary, hasFamilyPrimary } = useOrganization();

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPreview | null>(null);
  const [expanded, setExpanded] = useState(false);

  const placeholder = useMemo(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
    []
  );

  // ---- Apply helpers ------------------------------------------------------

  const applyResult = useCallback(async (result: FeedScopeParseResult, sourceText?: string) => {
    setBusy(true);
    setError(null);
    try {
      if (result.legacyFilter) {
        await setFilter(result.legacyFilter);
      } else if (result.scope) {
        await saveScope(result.scope, sourceText);
      }
      setPending(null);
      setText('');
      setExpanded(false);
    } catch (e: any) {
      setError(e?.message || 'Could not update your feed');
    } finally {
      setBusy(false);
    }
  }, [setFilter, saveScope]);

  // Chips: preview first; if the server has nothing to warn about, apply immediately (one tap).
  const applyChipScope = useCallback(async (chipScope: FeedScope, label: string) => {
    setBusy(true);
    setError(null);
    try {
      const preview = await previewScope(chipScope);
      if (preview.warnings && preview.warnings.length > 0) {
        setPending({ result: preview, sourceText: label });
      } else {
        await saveScope(preview.scope || chipScope, label);
        setPending(null);
        setExpanded(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not update your feed');
    } finally {
      setBusy(false);
    }
  }, [previewScope, saveScope]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await parseScope(trimmed);
      setPending({ result, sourceText: trimmed });
    } catch (err: any) {
      setError(err?.message || 'Could not understand that request');
    } finally {
      setBusy(false);
    }
  }, [text, busy, parseScope]);

  const clearCustom = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await setFilter('EVERYTHING');
    } catch (e: any) {
      setError(e?.message || 'Could not reset your feed');
    } finally {
      setBusy(false);
    }
  }, [setFilter]);

  // ---- Chip definitions ---------------------------------------------------

  const chips = useMemo(() => {
    const list: { key: string; label: string; scope?: FeedScope; legacy?: 'EVERYTHING' | 'ALL'; isActive: boolean }[] = [];
    const s = scope;

    const onlyFlags = (want: Partial<FeedScope>) => {
      if (!s || activeFilter !== 'CUSTOM') return false;
      const base = emptyFeedScope();
      const target = { ...base, ...want };
      return (
        s.includeChurchPrimary === target.includeChurchPrimary &&
        s.includeFamilyPrimary === target.includeFamilyPrimary &&
        s.includeFriends === target.includeFriends &&
        s.includeFollowing === target.includeFollowing &&
        s.includeMyGroups === target.includeMyGroups &&
        (s.organizationIds?.length || 0) === 0 &&
        (s.groupIds?.length || 0) === 0 &&
        (s.userIds?.length || 0) === 0 &&
        !!s.nearby === !!target.nearby
      );
    };

    if (hasChurchPrimary) {
      list.push({
        key: 'church',
        label: '⛪ My Church',
        scope: { ...emptyFeedScope(), includeChurchPrimary: true },
        isActive: onlyFlags({ includeChurchPrimary: true }),
      });
    }
    if (hasFamilyPrimary) {
      list.push({
        key: 'family',
        label: '🏠 My Family',
        scope: { ...emptyFeedScope(), includeFamilyPrimary: true },
        isActive: onlyFlags({ includeFamilyPrimary: true }),
      });
    }
    if (hasChurchPrimary && hasFamilyPrimary) {
      list.push({
        key: 'church-family',
        label: '⛪ + 🏠 Church & Family',
        scope: { ...emptyFeedScope(), includeChurchPrimary: true, includeFamilyPrimary: true },
        isActive: onlyFlags({ includeChurchPrimary: true, includeFamilyPrimary: true }),
      });
    }
    list.push({
      key: 'friends',
      label: '🤝 Friends',
      scope: { ...emptyFeedScope(), includeFriends: true },
      isActive: onlyFlags({ includeFriends: true }),
    });
    if (hasFamilyPrimary) {
      list.push({
        key: 'family-friends',
        label: '🏠 + 🤝 Family & Friends',
        scope: { ...emptyFeedScope(), includeFamilyPrimary: true, includeFriends: true },
        isActive: onlyFlags({ includeFamilyPrimary: true, includeFriends: true }),
      });
    }
    list.push({
      key: 'nearby',
      label: '📍 Churches Near Me',
      scope: {
        ...emptyFeedScope(),
        includeChurchPrimary: hasChurchPrimary,
        nearby: { radiusMiles: 25, sameDenominationOnly: false, denomination: null, orgTypes: ['CHURCH'] },
      },
      isActive: onlyFlags({
        includeChurchPrimary: hasChurchPrimary,
        nearby: { radiusMiles: 25, sameDenominationOnly: false, denomination: null, orgTypes: ['CHURCH'] },
      }),
    });
    list.push({
      key: 'everything',
      label: '🌐 Everything',
      legacy: 'EVERYTHING',
      isActive: activeFilter === 'EVERYTHING',
    });
    return list;
  }, [scope, activeFilter, hasChurchPrimary, hasFamilyPrimary]);

  // ---- Render -------------------------------------------------------------

  const showActiveBanner = activeFilter === 'CUSTOM' && !!scopeDescription && !pending;

  return (
    <Container>
      {showActiveBanner && (
        <ActiveBanner>
          <BannerText title={scopeDescription || undefined}>✨ Showing: {scopeDescription}</BannerText>
          <LinkButton type="button" onClick={() => setExpanded(v => !v)} disabled={busy}>
            {expanded ? 'Hide' : 'Change'}
          </LinkButton>
          <LinkButton type="button" onClick={clearCustom} disabled={busy} title="Back to Everything">
            ✕
          </LinkButton>
        </ActiveBanner>
      )}

      {(!showActiveBanner || expanded) && (
        <>
          <InputRow onSubmit={handleSubmit}>
            <TextInput
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
              disabled={busy || filterLoading}
              aria-label="Tell the app what you want to see in your feed"
            />
            <GoButton type="submit" disabled={busy || filterLoading || !text.trim()}>
              {busy ? '…' : 'Show me'}
            </GoButton>
          </InputRow>

          <ChipRow>
            {chips.map(chip => (
              <Chip
                key={chip.key}
                type="button"
                $active={chip.isActive}
                disabled={busy || filterLoading}
                onClick={() => {
                  if (chip.legacy) {
                    applyResult({ legacyFilter: chip.legacy, confidence: 1, warnings: [] });
                  } else if (chip.scope) {
                    applyChipScope(chip.scope, chip.label);
                  }
                }}
              >
                {chip.label}
              </Chip>
            ))}
          </ChipRow>
        </>
      )}

      {error && <ErrorText>⚠️ {error}</ErrorText>}

      {pending && (
        <PreviewCard role="dialog" aria-label="Confirm feed scope">
          <PreviewTitle>
            {pending.result.confidence >= 0.7 ? "Here's what I understood" : 'I think you mean…'}
          </PreviewTitle>
          <PreviewDescription>
            {pending.result.legacyFilter
              ? pending.result.description || (pending.result.legacyFilter === 'EVERYTHING' ? 'Everything' : 'All my groups')
              : `Showing: ${pending.result.description || 'Nothing selected'}`}
          </PreviewDescription>

          {pending.result.warnings && pending.result.warnings.length > 0 && (
            <WarningList>
              {pending.result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </WarningList>
          )}

          {pending.result.clarificationQuestion && (
            <Clarification>💭 {pending.result.clarificationQuestion}</Clarification>
          )}

          <ButtonRow>
            <SecondaryButton type="button" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </SecondaryButton>
            <GoButton
              type="button"
              onClick={() => applyResult(pending.result, pending.sourceText)}
              disabled={
                busy ||
                (!pending.result.legacyFilter &&
                  (!pending.result.scope || pending.result.description === 'Nothing selected'))
              }
            >
              {busy ? '…' : 'Apply'}
            </GoButton>
          </ButtonRow>
        </PreviewCard>
      )}
    </Container>
  );
};

export default FeedScopeInput;
