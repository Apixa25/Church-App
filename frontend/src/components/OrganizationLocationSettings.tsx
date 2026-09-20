import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

/**
 * Admin settings for how a church shows up in "nearby" / "same denomination"
 * feed scopes: denomination, address (geocoded server-side), optional GPS
 * capture, and a discoverable toggle.
 *
 * Saves via the existing JSON PUT /organizations/{id} (OrganizationRequest),
 * which now accepts these fields additively. Family organizations never appear
 * in discovery regardless of these settings.
 */

export const DENOMINATIONS = [
  'Non-denominational',
  'Baptist',
  'Southern Baptist',
  'Methodist',
  'United Methodist',
  'Lutheran',
  'Presbyterian',
  'Pentecostal',
  'Assemblies of God',
  'Church of God',
  'Church of Christ',
  'Nazarene',
  'Anglican',
  'Episcopal',
  'Catholic',
  'Orthodox',
  'Reformed',
  'Evangelical Free',
  'Calvary Chapel',
  'Vineyard',
  'Foursquare',
  'Wesleyan',
  'Mennonite',
  'Adventist',
  'Charismatic',
  'Other',
];

interface OrgLocationFields {
  name: string;
  slug: string;
  type: string;
  denomination?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  geocodeStatus?: string | null;
  discoverable?: boolean | null;
}

interface Props {
  organizationId: string;
  onSaved?: (org: OrgLocationFields) => void;
}

const OrganizationLocationSettings: React.FC<Props> = ({ organizationId, onSaved }) => {
  const [org, setOrg] = useState<OrgLocationFields | null>(null);
  const [form, setForm] = useState({
    denomination: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'United States',
    latitude: '',
    longitude: '',
    geocodeStatus: '',
    discoverable: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/organizations/${organizationId}`, { headers: authHeaders() });
        if (cancelled) return;
        const data: OrgLocationFields = res.data;
        setOrg(data);
        setForm({
          denomination: data.denomination || '',
          addressLine1: data.addressLine1 || '',
          addressLine2: data.addressLine2 || '',
          city: data.city || '',
          stateProvince: data.stateProvince || '',
          postalCode: data.postalCode || '',
          country: data.country || 'United States',
          latitude: data.latitude != null ? String(data.latitude) : '',
          longitude: data.longitude != null ? String(data.longitude) : '',
          geocodeStatus: data.geocodeStatus || '',
          discoverable: data.discoverable !== false,
        });
      } catch (e: any) {
        if (!cancelled) setError(e.response?.data?.message || 'Could not load organization details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [organizationId, authHeaders]);

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccess(null);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          geocodeStatus: 'GPS_CAPTURED',
        }));
        setSuccess('GPS captured - save to keep it.');
      },
      geoErr => setError(`Unable to capture location: ${geoErr.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleClearCoordinates = () => {
    setForm(prev => ({ ...prev, latitude: '', longitude: '', geocodeStatus: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setError(null);
    setSuccess(null);

    const lat = form.latitude.trim() ? Number(form.latitude) : null;
    const lng = form.longitude.trim() ? Number(form.longitude) : null;
    if ((lat != null && (isNaN(lat) || lat < -90 || lat > 90)) || (lng != null && (isNaN(lng) || lng < -180 || lng > 180))) {
      setError('Latitude must be -90..90 and longitude -180..180.');
      return;
    }
    if ((lat == null) !== (lng == null)) {
      setError('Enter both latitude and longitude, or leave both blank to geocode from the address.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        // Required by OrganizationRequest validation - unchanged values
        name: org.name,
        slug: org.slug,
        type: org.type,
        // Location & discovery
        denomination: form.denomination || null,
        addressLine1: form.addressLine1 || null,
        addressLine2: form.addressLine2 || null,
        city: form.city || null,
        stateProvince: form.stateProvince || null,
        postalCode: form.postalCode || null,
        country: form.country || null,
        latitude: lat,
        longitude: lng,
        geocodeStatus: lat != null ? (form.geocodeStatus || 'MANUAL') : null,
        discoverable: form.discoverable,
      };
      const res = await axios.put(`${API_BASE_URL}/organizations/${organizationId}`, payload, {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      const saved: OrgLocationFields = res.data;
      setOrg(saved);
      setForm(prev => ({
        ...prev,
        latitude: saved.latitude != null ? String(saved.latitude) : '',
        longitude: saved.longitude != null ? String(saved.longitude) : '',
        geocodeStatus: saved.geocodeStatus || '',
      }));
      if (saved.latitude != null) {
        setSuccess(`Saved. Location ${saved.geocodeStatus === 'GEOCODED' ? 'found from address' : 'set'} - nearby members can now find you.`);
      } else if (saved.geocodeStatus === 'FAILED') {
        setSuccess('Saved, but we could not find coordinates for that address. Try "Use current GPS" while at the church, or check the address.');
      } else {
        setSuccess('Saved.');
      }
      onSaved?.(saved);
    } catch (e: any) {
      if (e.response?.status === 403) {
        setError('You do not have permission to update this organization.');
      } else {
        setError(e.response?.data?.message || 'Failed to save location settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Section><Hint>Loading location settings…</Hint></Section>;
  }
  if (!org) {
    return <Section>{error && <ErrorMessage>{error}</ErrorMessage>}</Section>;
  }

  const isFamily = org.type === 'FAMILY';

  return (
    <Section>
      <SectionTitle>📍 Location &amp; Discovery</SectionTitle>
      <Hint>
        {isFamily
          ? 'Family groups are always private and never show up in nearby searches. Location is optional.'
          : 'Lets members find your church with "churches near me" or "Baptist churches within 50 miles". We convert the address to coordinates automatically.'}
      </Hint>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <Form onSubmit={handleSave}>
        {!isFamily && (
          <FormGroup>
            <Label htmlFor="denomination">Denomination</Label>
            <Select
              id="denomination"
              value={DENOMINATIONS.includes(form.denomination) || form.denomination === '' ? form.denomination : 'Other'}
              onChange={e => update('denomination', e.target.value)}
              disabled={saving}
            >
              <option value="">Not set</option>
              {DENOMINATIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
            {(form.denomination === 'Other' || (form.denomination && !DENOMINATIONS.includes(form.denomination))) && (
              <Input
                type="text"
                placeholder="Type your denomination"
                value={DENOMINATIONS.includes(form.denomination) ? '' : form.denomination}
                onChange={e => update('denomination', e.target.value)}
                maxLength={100}
                disabled={saving}
              />
            )}
          </FormGroup>
        )}

        <FormGroup>
          <Label htmlFor="addressLine1">Street address</Label>
          <Input id="addressLine1" value={form.addressLine1} onChange={e => update('addressLine1', e.target.value)} maxLength={255} disabled={saving} />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
          <Input id="addressLine2" value={form.addressLine2} onChange={e => update('addressLine2', e.target.value)} maxLength={255} disabled={saving} />
        </FormGroup>
        <Row>
          <FormGroup style={{ flex: 2 }}>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={e => update('city', e.target.value)} maxLength={100} disabled={saving} />
          </FormGroup>
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="stateProvince">State</Label>
            <Input id="stateProvince" value={form.stateProvince} onChange={e => update('stateProvince', e.target.value)} maxLength={100} disabled={saving} />
          </FormGroup>
          <FormGroup style={{ flex: 1 }}>
            <Label htmlFor="postalCode">ZIP</Label>
            <Input id="postalCode" value={form.postalCode} onChange={e => update('postalCode', e.target.value)} maxLength={20} disabled={saving} />
          </FormGroup>
        </Row>
        <FormGroup>
          <Label htmlFor="country">Country</Label>
          <Input id="country" value={form.country} onChange={e => update('country', e.target.value)} maxLength={100} disabled={saving} />
        </FormGroup>

        <FormGroup>
          <Label>Coordinates</Label>
          <Row>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Latitude"
              value={form.latitude}
              onChange={e => update('latitude', e.target.value)}
              disabled={saving}
            />
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Longitude"
              value={form.longitude}
              onChange={e => update('longitude', e.target.value)}
              disabled={saving}
            />
          </Row>
          <Row>
            <SmallButton type="button" onClick={handleUseGps} disabled={saving}>📡 Use current GPS</SmallButton>
            {(form.latitude || form.longitude) && (
              <SmallButton type="button" onClick={handleClearCoordinates} disabled={saving}>Clear (re-geocode from address)</SmallButton>
            )}
          </Row>
          <Hint>
            {form.geocodeStatus
              ? `Status: ${form.geocodeStatus.replace('_', ' ').toLowerCase()}`
              : 'Leave blank and we will look up coordinates from the address when you save.'}
          </Hint>
        </FormGroup>

        {!isFamily && (
          <FormGroup>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={form.discoverable}
                onChange={e => update('discoverable', e.target.checked)}
                disabled={saving}
              />
              Discoverable - allow people who are not members to find us in nearby / denomination searches
            </CheckboxLabel>
            <Hint>Non-members only see posts marked public. Anyone can mark a post "Members only" when composing it.</Hint>
          </FormGroup>
        )}

        <ButtonRow>
          <SubmitButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Location Settings'}
          </SubmitButton>
        </ButtonRow>
      </Form>
    </Section>
  );
};

// ---- styles ---------------------------------------------------------------

const Section = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-primary, #e5e7eb);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
`;

const Hint = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #666);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  > * {
    flex: 1;
    min-width: 120px;
  }
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
`;

const Input = styled.input`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-sm, 6px);
  background: var(--bg-tertiary, #fafafa);
  color: var(--text-primary, #1a1a1a);

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #5b7fff);
  }
`;

const Select = styled.select`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-sm, 6px);
  background: var(--bg-tertiary, #fafafa);
  color: var(--text-primary, #1a1a1a);
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;

  input {
    margin-top: 3px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const SubmitButton = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--border-radius-sm, 6px);
  border: none;
  cursor: pointer;
  background: var(--gradient-primary, linear-gradient(135deg, #5b7fff 0%, #8b5cf6 100%));
  color: white;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SmallButton = styled.button`
  padding: 7px 12px;
  font-size: 13px;
  border-radius: var(--border-radius-sm, 6px);
  border: 1px solid var(--border-primary, #ddd);
  background: var(--bg-elevated, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #5b7fff);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--error, #ef4444);
  border-radius: var(--border-radius-sm, 6px);
  color: var(--error, #ef4444);
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  padding: 10px 12px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid #22c55e;
  border-radius: var(--border-radius-sm, 6px);
  color: #15803d;
  font-size: 14px;
`;

export default OrganizationLocationSettings;
