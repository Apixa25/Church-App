import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * One-shot "where am I?" for discovery features.
 *
 * Uses @capacitor/geolocation so the native iOS/Android apps go through the platform
 * permission prompt (Info.plist / AndroidManifest strings already exist), and falls back
 * to navigator.geolocation on the web. Errors are mapped to short, user-facing messages.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export type PositionErrorKind = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'unknown';

export class PositionError extends Error {
  kind: PositionErrorKind;

  constructor(kind: PositionErrorKind, message: string) {
    super(message);
    this.name = 'PositionError';
    this.kind = kind;
  }
}

const TIMEOUT_MS = 12000;

const friendlyMessage = (kind: PositionErrorKind): string => {
  switch (kind) {
    case 'denied':
      return 'Location access was turned off. Allow it in your device settings, or type a city or ZIP instead.';
    case 'timeout':
      return "We couldn't get a fix on your location in time. Try again, or type a city or ZIP.";
    case 'unavailable':
      return "Your location isn't available right now. Type a city or ZIP to search instead.";
    case 'unsupported':
      return "This device can't share its location. Type a city or ZIP to search instead.";
    default:
      return "Something went wrong reading your location. Type a city or ZIP to search instead.";
  }
};

/** Both Capacitor and the browser surface permission problems as code 1 / "denied" text. */
const classifyError = (err: any): PositionErrorKind => {
  const code: number | undefined = typeof err?.code === 'number' ? err.code : undefined;
  const text = String(err?.message || err || '').toLowerCase();
  if (code === 1 || text.includes('denied') || text.includes('permission')) return 'denied';
  if (code === 3 || text.includes('timeout') || text.includes('timed out')) return 'timeout';
  if (code === 2 || text.includes('unavailable')) return 'unavailable';
  if (text.includes('not implemented') || text.includes('not supported') || text.includes('unsupported')) return 'unsupported';
  return 'unknown';
};

export const getCurrentCoordinates = async (): Promise<Coordinates> => {
  if (!Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && !navigator.geolocation) {
    throw new PositionError('unsupported', friendlyMessage('unsupported'));
  }

  try {
    if (Capacitor.isNativePlatform()) {
      // Ask explicitly first so a "denied" answer is reported cleanly instead of as a generic failure
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
          throw new PositionError('denied', friendlyMessage('denied'));
        }
      }
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false, // city-level is plenty for a 25 mi radius and is faster / kinder to battery
      timeout: TIMEOUT_MS,
      maximumAge: 5 * 60 * 1000,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
    };
  } catch (err: any) {
    if (err instanceof PositionError) {
      throw err;
    }
    const kind = classifyError(err);
    throw new PositionError(kind, friendlyMessage(kind));
  }
};

export const useCurrentPosition = () => {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PositionError | null>(null);

  const locate = useCallback(async (): Promise<Coordinates | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCurrentCoordinates();
      setCoords(result);
      return result;
    } catch (err: any) {
      setError(err as PositionError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCoords(null);
    setError(null);
  }, []);

  return { coords, loading, error, locate, reset };
};

export default useCurrentPosition;
