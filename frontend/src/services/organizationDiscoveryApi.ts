import api from './api';

/**
 * Location-based organization discovery ("churches near me").
 * Backend: OrganizationDiscoveryController - GET /organizations/nearby, GET /organizations/denominations.
 * Distances are in miles, matching the feed's "near me" scope.
 */

export interface NearbyOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  type: 'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'GENERAL' | string;
  denomination?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  memberCount: number;
}

export interface NearbyCenter {
  latitude: number;
  longitude: number;
  label: string;
}

export interface NearbyResponse {
  center: NearbyCenter;
  radiusMiles: number;
  results: NearbyOrganization[];
}

export type NearbyQuery =
  | { lat: number; lng: number; q?: undefined }
  | { q: string; lat?: undefined; lng?: undefined };

export interface NearbyOptions {
  radiusMiles?: number;
  types?: string[];
  denomination?: string | null;
}

export const RADIUS_OPTIONS_MILES = [10, 25, 50, 100] as const;
export const DEFAULT_RADIUS_MILES = 25;

/**
 * ✨ Natural-language finder - POST /organizations/finder.
 * Rules handle the easy phrases instantly; OpenAI only steps in for ambiguous sentences.
 * The server always tells us what it actually searched (`interpretation`) so a misread is obvious.
 */
export interface FinderIntent {
  nameHints: string[];
  denomination?: string | null;
  orgTypes: string[];
  placeText?: string | null;
  nearUser: boolean;
  radiusMiles?: number | null;
}

export interface FinderMatch {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  type: string;
  tier?: string | null;
  denomination?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  memberCount: number;
  /** Only present when the search was centred on a place. */
  distanceMiles?: number | null;
}

export interface FinderResponse {
  interpretation: string;
  source: 'RULES' | 'AI' | string;
  confidence: number;
  clarificationQuestion?: string | null;
  /** "near me" without coordinates - retry with lat/lng after asking the device. */
  needsLocation: boolean;
  /** The user was really asking about a family group - point them to the invite flow. */
  familyRequested: boolean;
  intent: FinderIntent;
  results: FinderMatch[];
  warnings: string[];
  sourceText?: string;
}

export const FINDER_MAX_LENGTH = 300;

const organizationDiscoveryApi = {
  getNearby: async (where: NearbyQuery, options: NearbyOptions = {}): Promise<NearbyResponse> => {
    const params: Record<string, string | number> = {};
    if (where.q !== undefined) {
      params.q = where.q;
    } else {
      params.lat = where.lat;
      params.lng = where.lng;
    }
    params.radiusMiles = options.radiusMiles ?? DEFAULT_RADIUS_MILES;
    if (options.types && options.types.length > 0) {
      params.types = options.types.join(',');
    }
    if (options.denomination) {
      params.denomination = options.denomination;
    }
    const response = await api.get('/organizations/nearby', { params });
    return response.data;
  },

  getDenominations: async (): Promise<string[]> => {
    const response = await api.get('/organizations/denominations');
    return response.data;
  },

  askFinder: async (
    text: string,
    coords?: { lat: number; lng: number } | null
  ): Promise<FinderResponse> => {
    const body: Record<string, string | number> = { text: text.trim().slice(0, FINDER_MAX_LENGTH) };
    if (coords) {
      body.lat = coords.lat;
      body.lng = coords.lng;
    }
    const response = await api.post('/organizations/finder', body);
    return response.data;
  },
};

/** Backend ErrorResponse -> friendly text (developerMessage carries the specific reason). */
export const discoveryErrorMessage = (err: any, fallback: string): string => {
  const data = err?.response?.data;
  return data?.developerMessage || data?.userMessage || data?.message || err?.message || fallback;
};

export default organizationDiscoveryApi;
