import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getMapTileAttribution, getMapTileUrl } from '../config/runtimeConfig';
import { NearbyCenter, NearbyOrganization } from '../services/organizationDiscoveryApi';

/**
 * NearbyChurchMap - the only module that imports Leaflet. Lazy-loaded by NearbyChurchFinder
 * so the map library stays out of the main bundle (and out of Jest, where react-leaflet's
 * ESM-only build can't be required by CRA's Jest 27).
 *
 * Tiles come from getMapTileUrl() - OpenStreetMap by default, swappable at runtime via
 * public/config.js for production-scale traffic.
 */

// Leaflet resolves its default marker images relative to the CSS file, which webpack breaks.
// Pointing the default icon at the bundled PNGs is the standard fix.
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface NearbyChurchMapProps {
  center: NearbyCenter;
  radiusMiles: number;
  results: NearbyOrganization[];
  /** Id of the result whose popup should open (from "Show on map" in the list). */
  focusedId?: string | null;
  renderPopupActions?: (org: NearbyOrganization) => React.ReactNode;
  height?: number;
}

/** Re-fits the viewport whenever the result set changes. */
const FitToResults: React.FC<{ center: NearbyCenter; results: NearbyOrganization[]; radiusMiles: number }> = ({
  center,
  results,
  radiusMiles,
}) => {
  const map = useMap();
  useEffect(() => {
    const points: L.LatLngExpression[] = [[center.latitude, center.longitude]];
    results.forEach(r => points.push([r.latitude, r.longitude]));
    if (points.length === 1) {
      // No results: show roughly the search radius so the user sees the empty area
      const zoom = radiusMiles <= 10 ? 11 : radiusMiles <= 25 ? 10 : radiusMiles <= 50 ? 9 : 8;
      map.setView(points[0], zoom);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 14 });
  }, [map, center.latitude, center.longitude, results, radiusMiles]);
  return null;
};

/** Opens the popup for the focused result and pans to it. */
const FocusMarker: React.FC<{ focused: NearbyOrganization | null }> = ({ focused }) => {
  const map = useMap();
  useEffect(() => {
    if (!focused) return;
    map.panTo([focused.latitude, focused.longitude]);
  }, [map, focused]);
  return null;
};

const NearbyChurchMap: React.FC<NearbyChurchMapProps> = ({
  center,
  radiusMiles,
  results,
  focusedId,
  renderPopupActions,
  height = 340,
}) => {
  const focused = useMemo(() => results.find(r => r.id === focusedId) || null, [results, focusedId]);

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={10}
      scrollWheelZoom={false}
      style={{ height, width: '100%', borderRadius: 16, zIndex: 0 }}
      aria-label="Map of churches near you"
    >
      <TileLayer url={getMapTileUrl()} attribution={getMapTileAttribution()} />

      <CircleMarker
        center={[center.latitude, center.longitude]}
        radius={8}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#4a90e2', fillOpacity: 0.95 }}
      >
        <Popup>{center.label}</Popup>
      </CircleMarker>

      {results.map(org => (
        <Marker
          key={org.id}
          position={[org.latitude, org.longitude]}
          ref={marker => {
            if (marker && org.id === focusedId) {
              marker.openPopup();
            }
          }}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong style={{ fontSize: 14 }}>{org.name}</strong>
              <div style={{ fontSize: 12, color: '#555', margin: '2px 0 6px' }}>
                {[org.denomination, [org.city, org.stateProvince].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: renderPopupActions ? 8 : 0 }}>
                📍 {org.distanceMiles} mi · 👥 {org.memberCount}
              </div>
              {renderPopupActions?.(org)}
            </div>
          </Popup>
        </Marker>
      ))}

      <FitToResults center={center} results={results} radiusMiles={radiusMiles} />
      <FocusMarker focused={focused} />
    </MapContainer>
  );
};

export default NearbyChurchMap;
