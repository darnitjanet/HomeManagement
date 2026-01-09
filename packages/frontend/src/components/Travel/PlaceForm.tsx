import { useState, useEffect } from 'react';
import { X, Search, MapPin, Star } from 'lucide-react';
import { travelApi } from '../../services/api';

interface TravelPlace {
  id: number;
  name: string;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  stateCode: string | null;
  latitude: number;
  longitude: number;
  visitDate: string | null;
  visitEndDate: string | null;
  tripId: number | null;
  tripName: string | null;
  notes: string | null;
  highlights: string | null;
  rating: number | null;
  companions: string | null;
  expenses: string | null;
  photoUrls: string | null;
}

interface Trip {
  id: number;
  name: string;
}

interface PlaceFormProps {
  place: TravelPlace | null;
  position: { lat: number; lng: number; name?: string } | null;
  trips: Trip[];
  onClose: () => void;
  onSave: () => void;
}

interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country?: string;
    country_code?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

export function PlaceForm({ place, position, trips, onClose, onSave }: PlaceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    countryCode: '',
    state: '',
    stateCode: '',
    latitude: 0,
    longitude: 0,
    visitDate: '',
    visitEndDate: '',
    tripId: null as number | null,
    tripName: '',
    notes: '',
    highlights: '',
    rating: null as number | null,
    companions: '',
    expenses: '',
    photoUrls: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing place or clicked position
  useEffect(() => {
    if (place) {
      setFormData({
        name: place.name,
        country: place.country || '',
        countryCode: place.countryCode || '',
        state: place.state || '',
        stateCode: place.stateCode || '',
        latitude: place.latitude,
        longitude: place.longitude,
        visitDate: place.visitDate || '',
        visitEndDate: place.visitEndDate || '',
        tripId: place.tripId,
        tripName: place.tripName || '',
        notes: place.notes || '',
        highlights: place.highlights || '',
        rating: place.rating,
        companions: place.companions || '',
        expenses: place.expenses || '',
        photoUrls: place.photoUrls || '',
      });
    } else if (position) {
      setFormData((prev) => ({
        ...prev,
        latitude: position.lat,
        longitude: position.lng,
        name: position.name ? position.name.split(',')[0] : '',
      }));
      // Reverse geocode to get location details
      if (position.lat && position.lng && !position.name) {
        reverseGeocode(position.lat, position.lng);
      } else if (position.name) {
        // Parse the name for country/state info
        parseLocationName(position.name);
      }
    }
  }, [place, position]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data.address) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || data.address.city || data.address.town || data.address.village || data.address.county || '',
          country: data.address.country || '',
          countryCode: data.address.country_code?.toUpperCase() || '',
          state: data.address.state || '',
          stateCode: getStateCode(data.address.state, data.address.country_code),
        }));
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const parseLocationName = (name: string) => {
    const parts = name.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      setFormData((prev) => ({
        ...prev,
        country: parts[parts.length - 1] || '',
        state: parts.length >= 3 ? parts[parts.length - 2] : '',
      }));
    }
  };

  const getStateCode = (stateName: string | undefined, countryCode: string | undefined): string => {
    if (!stateName || countryCode?.toLowerCase() !== 'us') return '';

    const stateMap: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
      'District of Columbia': 'DC',
    };
    return stateMap[stateName] || '';
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: GeocodingResult) => {
    const nameParts = result.display_name.split(',');
    setFormData({
      ...formData,
      name: nameParts[0].trim(),
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      country: result.address?.country || '',
      countryCode: result.address?.country_code?.toUpperCase() || '',
      state: result.address?.state || '',
      stateCode: getStateCode(result.address?.state, result.address?.country_code),
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Place name is required');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Location coordinates are required. Search for a place or click on the map.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        country: formData.country || undefined,
        countryCode: formData.countryCode || undefined,
        state: formData.state || undefined,
        stateCode: formData.stateCode || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        visitDate: formData.visitDate || undefined,
        visitEndDate: formData.visitEndDate || undefined,
        tripId: formData.tripId || undefined,
        tripName: formData.tripName || undefined,
        notes: formData.notes || undefined,
        highlights: formData.highlights || undefined,
        rating: formData.rating || undefined,
        companions: formData.companions || undefined,
        expenses: formData.expenses || undefined,
        photoUrls: formData.photoUrls || undefined,
      };

      if (place) {
        await travelApi.updatePlace(place.id, payload);
      } else {
        await travelApi.createPlace(payload);
      }
      onSave();
    } catch (error: any) {
      console.error('Failed to save place:', error);
      setError(error.response?.data?.error || 'Failed to save place');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="place-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{place ? 'Edit Place' : 'Add New Place'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-content">
            {error && <div className="form-error">{error}</div>}

            {/* Search Section */}
            {!place && (
              <div className="form-section">
                <h3>Search Location</h3>
                <div className="search-row">
                  <input
                    type="text"
                    placeholder="Search for a city, landmark, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                  />
                  <button type="button" onClick={handleSearch} disabled={searching}>
                    <Search size={18} />
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="search-results-form">
                    {searchResults.map((result, i) => (
                      <div
                        key={i}
                        className="search-result-item"
                        onClick={() => handleSelectSearchResult(result)}
                      >
                        <MapPin size={14} />
                        <span>{result.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Basic Info */}
            <div className="form-section">
              <h3>Place Details</h3>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Grand Canyon, Paris, Tokyo Tower"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., United States"
                  />
                </div>
                <div className="form-group">
                  <label>State/Region</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g., California"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 36.1069"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., -112.1129"
                  />
                </div>
              </div>
            </div>

            {/* Visit Info */}
            <div className="form-section">
              <h3>Visit Info</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Visit Date</label>
                  <input
                    type="date"
                    value={formData.visitDate}
                    onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date (if multi-day)</label>
                  <input
                    type="date"
                    value={formData.visitEndDate}
                    onChange={(e) => setFormData({ ...formData, visitEndDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Trip</label>
                  <select
                    value={formData.tripId || ''}
                    onChange={(e) => setFormData({ ...formData, tripId: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">No trip</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>{trip.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Or Trip Name (text)</label>
                  <input
                    type="text"
                    value={formData.tripName}
                    onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                    placeholder="e.g., Summer 2024 Road Trip"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Rating</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${formData.rating && formData.rating >= star ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, rating: formData.rating === star ? null : star })}
                    >
                      <Star
                        size={24}
                        fill={formData.rating && formData.rating >= star ? '#dc9e33' : 'none'}
                        color={formData.rating && formData.rating >= star ? '#dc9e33' : '#ccc'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="form-section">
              <h3>Additional Details</h3>
              <div className="form-group">
                <label>Companions</label>
                <input
                  type="text"
                  value={formData.companions}
                  onChange={(e) => setFormData({ ...formData, companions: e.target.value })}
                  placeholder="e.g., Family, John & Jane, Solo"
                />
              </div>
              <div className="form-group">
                <label>Expenses</label>
                <input
                  type="text"
                  value={formData.expenses}
                  onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                  placeholder="e.g., $500 total, $100/day"
                />
              </div>
              <div className="form-group">
                <label>Highlights</label>
                <textarea
                  value={formData.highlights}
                  onChange={(e) => setFormData({ ...formData, highlights: e.target.value })}
                  placeholder="Best moments and memories..."
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any other notes about this place..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Photo URLs (comma-separated)</label>
                <input
                  type="text"
                  value={formData.photoUrls}
                  onChange={(e) => setFormData({ ...formData, photoUrls: e.target.value })}
                  placeholder="https://example.com/photo1.jpg, https://..."
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : place ? 'Update Place' : 'Add Place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
