import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import organizationDiscoveryApi, {
  DEFAULT_RADIUS_MILES,
  NearbyOrganization,
  NearbyQuery,
  NearbyResponse,
  RADIUS_OPTIONS_MILES,
  discoveryErrorMessage,
} from '../services/organizationDiscoveryApi';
import { useCurrentPosition } from '../hooks/useCurrentPosition';

// Leaflet lives only in NearbyChurchMap; load it on demand so the map library isn't in the main bundle.
const NearbyChurchMap = lazy(() => import('./NearbyChurchMap'));

/**
 * NearbyChurchFinder - "Find churches near you".
 *
 * Solves the case where a new member doesn't know the exact name of the church they're
 * looking for: search by device location or by typing a city / ZIP, then browse results
 * on a map and in a distance-sorted list. Joining actions are supplied by the parent
 * (OrganizationBrowser) so the dual-primary logic stays in one place.
 */

export interface NearbyChurchFinderProps {
  onJoinAsPrimary: (orgId: string, orgName: string, orgType?: string) => void | Promise<void>;
  onJoinAsSecondary: (orgId: string, orgName: string) => void | Promise<void>;
  isMember: (orgId: string) => boolean;
  isPrimary: (orgId: string) => boolean;
  actionLoading: string | null;
  /** Restrict types (defaults to churches, ministries, nonprofits on the backend). */
  types?: string[];
}

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  margin-bottom: 24px;
  border-radius: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
`;

const PanelHint = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
`;

const Controls = styled.form`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: stretch;
`;

const ControlButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 16px;
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

const TextInput = styled.input`
  flex: 1 1 200px;
  min-width: 0;
  padding: 10px 14px;
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

const Select = styled.select`
  padding: 10px 12px;
  border-radius: 24px;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
`;

const Message = styled.div<{ $tone: 'error' | 'info' }>`
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: ${p => (p.$tone === 'error' ? '#ef4444' : 'var(--text-secondary)')};
  background: ${p => (p.$tone === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)')};
  border: 1px solid ${p => (p.$tone === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-primary)')};
`;

const MapFrame = styled.div`
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  background: var(--bg-primary);
  min-height: 200px;
`;

const MapPlaceholder = styled.div`
  height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
`;

const ResultsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
`;

const ResultList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
`;

const ResultCard = styled.li<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 12px;
  background: var(--bg-primary);
  border: 1px solid ${p => (p.$active ? 'var(--accent-primary, #4a90e2)' : 'var(--border-primary)')};
`;

const ResultTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
`;

const ResultName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-word;
`;

const Distance = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  background: rgba(74, 144, 226, 0.14);
  color: var(--text-primary);
`;

const ResultMeta = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
`;

const ResultActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const SmallButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost' }>`
  padding: 7px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: ${p => (p.$variant === 'primary' ? 'none' : '1px solid var(--border-primary)')};
  background: ${p =>
    p.$variant === 'primary' ? 'var(--gradient-primary)' : p.$variant === 'ghost' ? 'transparent' : 'var(--bg-secondary)'};
  color: ${p => (p.$variant === 'primary' ? 'white' : 'var(--text-primary)')};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const typeLabel = (type: string) => {
  switch (type) {
    case 'CHURCH': return '⛪ Church';
    case 'MINISTRY': return '🙏 Ministry';
    case 'NONPROFIT': return '🤝 Nonprofit';
    default: return type;
  }
};

const NearbyChurchFinder: React.FC<NearbyChurchFinderProps> = ({
  onJoinAsPrimary,
  onJoinAsSecondary,
  isMember,
  isPrimary,
  actionLoading,
  types,
}) => {
  const { locate, loading: locating, error: positionError } = useCurrentPosition();

  const [locationText, setLocationText] = useState('');
  const [radiusMiles, setRadiusMiles] = useState<number>(DEFAULT_RADIUS_MILES);
  const [denomination, setDenomination] = useState<string>('');
  const [denominations, setDenominations] = useState<string[]>([]);

  const [lastQuery, setLastQuery] = useState<NearbyQuery | null>(null);
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    organizationDiscoveryApi
      .getDenominations()
      .then(list => { if (!cancelled) setDenominations(list || []); })
      .catch(() => { /* filter is optional - hide it if the list can't load */ });
    return () => { cancelled = true; };
  }, []);

  const runSearch = useCallback(
    async (where: NearbyQuery, radius: number, denom: string) => {
      setSearching(true);
      setError(null);
      setFocusedId(null);
      try {
        const response = await organizationDiscoveryApi.getNearby(where, {
          radiusMiles: radius,
          denomination: denom || null,
          types,
        });
        setData(response);
        setLastQuery(where);
      } catch (err: any) {
        setError(discoveryErrorMessage(err, "We couldn't search that area right now. Please try again."));
      } finally {
        setSearching(false);
      }
    },
    [types]
  );

  const handleUseMyLocation = async () => {
    setError(null);
    const coords = await locate();
    if (coords) {
      await runSearch({ lat: coords.latitude, lng: coords.longitude }, radiusMiles, denomination);
    }
  };

  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = locationText.trim();
    if (!q) return;
    runSearch({ q }, radiusMiles, denomination);
  };

  // Re-run the last search when filters change so the map stays in sync with the controls
  const handleRadiusChange = (value: number) => {
    setRadiusMiles(value);
    if (lastQuery) runSearch(lastQuery, value, denomination);
  };

  const handleDenominationChange = (value: string) => {
    setDenomination(value);
    if (lastQuery) runSearch(lastQuery, radiusMiles, value);
  };

  const results = useMemo(() => data?.results ?? [], [data]);
  const visibleError = error || positionError?.message || null;

  const renderActions = (org: NearbyOrganization, compact = false) => {
    if (isPrimary(org.id)) {
      return <SmallButton disabled>Your Church Primary</SmallButton>;
    }
    if (isMember(org.id)) {
      return <SmallButton disabled>Member</SmallButton>;
    }
    const busy = actionLoading === org.id;
    return (
      <>
        <SmallButton
          type="button"
          $variant="primary"
          disabled={busy}
          onClick={() => onJoinAsPrimary(org.id, org.name, org.type)}
          title="Set as your Church Primary organization"
        >
          {busy ? 'Joining...' : 'Set as Church Primary'}
        </SmallButton>
        {!compact && (
          <SmallButton
            type="button"
            $variant="secondary"
            disabled={busy}
            onClick={() => onJoinAsSecondary(org.id, org.name)}
            title="Join as secondary to see public posts in your feed"
          >
            Join as Secondary
          </SmallButton>
        )}
      </>
    );
  };

  return (
    <Panel aria-label="Find churches near you">
      <PanelHeader>
        <PanelTitle>📍 Find churches near you</PanelTitle>
        <PanelHint>Don't know the name? Search by where you are, or by a city or ZIP code.</PanelHint>
      </PanelHeader>

      <Controls onSubmit={handleTextSearch}>
        <ControlButton type="button" onClick={handleUseMyLocation} disabled={locating || searching}>
          {locating ? 'Locating...' : '📍 Use my location'}
        </ControlButton>
        <TextInput
          type="text"
          value={locationText}
          onChange={e => setLocationText(e.target.value)}
          placeholder="City, state or ZIP (e.g. Austin, TX)"
          aria-label="City, state or ZIP code"
          autoComplete="off"
        />
        <ControlButton type="submit" $variant="secondary" disabled={!locationText.trim() || searching}>
          {searching ? 'Searching...' : 'Search'}
        </ControlButton>
        <Select
          value={radiusMiles}
          onChange={e => handleRadiusChange(Number(e.target.value))}
          aria-label="Search radius"
        >
          {RADIUS_OPTIONS_MILES.map(r => (
            <option key={r} value={r}>Within {r} mi</option>
          ))}
        </Select>
        {denominations.length > 0 && (
          <Select
            value={denomination}
            onChange={e => handleDenominationChange(e.target.value)}
            aria-label="Denomination"
          >
            <option value="">Any denomination</option>
            {denominations.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        )}
      </Controls>

      {visibleError && <Message $tone="error">{visibleError}</Message>}

      {data && (
        <>
          <MapFrame>
            <Suspense fallback={<MapPlaceholder>Loading map...</MapPlaceholder>}>
              <NearbyChurchMap
                center={data.center}
                radiusMiles={data.radiusMiles}
                results={results}
                focusedId={focusedId}
                renderPopupActions={org => <ResultActions>{renderActions(org, true)}</ResultActions>}
              />
            </Suspense>
          </MapFrame>

          <ResultsHeader>
            <span>
              {results.length === 0
                ? `No churches found within ${data.radiusMiles} mi of ${data.center.label}.`
                : `${results.length} ${results.length === 1 ? 'result' : 'results'} within ${data.radiusMiles} mi of ${data.center.label}`}
            </span>
            {results.length === 0 && <span>Try a larger radius, or search by name above.</span>}
          </ResultsHeader>

          {results.length > 0 && (
            <ResultList>
              {results.map(org => (
                <ResultCard key={org.id} $active={org.id === focusedId}>
                  <ResultTop>
                    <ResultName>{org.name}</ResultName>
                    <Distance>{org.distanceMiles} mi</Distance>
                  </ResultTop>
                  <ResultMeta>
                    {[typeLabel(org.type), org.denomination, [org.city, org.stateProvince].filter(Boolean).join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                    {' · '}👥 {org.memberCount}
                  </ResultMeta>
                  <ResultActions>
                    {renderActions(org)}
                    <SmallButton type="button" $variant="ghost" onClick={() => setFocusedId(org.id)}>
                      🗺️ Show on map
                    </SmallButton>
                  </ResultActions>
                </ResultCard>
              ))}
            </ResultList>
          )}
        </>
      )}
    </Panel>
  );
};

export default NearbyChurchFinder;
