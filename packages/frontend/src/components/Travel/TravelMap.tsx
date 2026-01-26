import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Plus, List, Map as MapIcon, Search, Star, Calendar, Users, DollarSign, Briefcase, Package } from 'lucide-react';
import { travelApi } from '../../services/api';
import { PlaceForm } from './PlaceForm';
import { PackingList } from './PackingList';
import 'leaflet/dist/leaflet.css';
import './TravelMap.css';

// Fix for default marker icons in webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#da6b34" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

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
  createdAt: string;
  updatedAt: string;
}

interface TravelStats {
  totalPlaces: number;
  countriesVisited: number;
  usStatesVisited: number;
  totalTrips: number;
}

interface Trip {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to handle search and pan
function SearchControl({ onSearchResult }: { onSearchResult: (lat: number, lng: number, name: string) => void }) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      // Use OpenStreetMap Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    map.flyTo([lat, lng], 10);
    onSearchResult(lat, lng, result.display_name);
    setResults([]);
    setQuery('');
  };

  return (
    <div className="map-search-control" ref={searchRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search for a place..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={searching}>
          <Search size={18} />
        </button>
      </div>
      {results.length > 0 && (
        <div className="search-results">
          {results.map((result, i) => (
            <div
              key={i}
              className="search-result-item"
              onClick={() => handleSelectResult(result)}
            >
              <MapPin size={14} />
              <span>{result.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TravelMap() {
  const [places, setPlaces] = useState<TravelPlace[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlace, setEditingPlace] = useState<TravelPlace | null>(null);
  const [clickedPosition, setClickedPosition] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'trips'>('map');
  const [_selectedPlace, setSelectedPlace] = useState<TravelPlace | null>(null);
  const [packingTrip, setPackingTrip] = useState<Trip | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [placesRes, tripsRes, statsRes] = await Promise.all([
        travelApi.getAllPlaces(),
        travelApi.getAllTrips(),
        travelApi.getStats(),
      ]);
      if (placesRes.data.success) setPlaces(placesRes.data.data);
      if (tripsRes.data.success) setTrips(tripsRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to load travel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setClickedPosition({ lat, lng });
    setEditingPlace(null);
    setShowForm(true);
  };

  const handleSearchResult = (lat: number, lng: number, name: string) => {
    setClickedPosition({ lat, lng, name });
    setEditingPlace(null);
    setShowForm(true);
  };

  const handleAddPlace = () => {
    setClickedPosition(null);
    setEditingPlace(null);
    setShowForm(true);
  };

  const handleEditPlace = (place: TravelPlace) => {
    setEditingPlace(place);
    setClickedPosition({ lat: place.latitude, lng: place.longitude });
    setShowForm(true);
  };

  const handleDeletePlace = async (id: number) => {
    if (!confirm('Are you sure you want to delete this place?')) return;
    try {
      await travelApi.deletePlace(id);
      loadData();
      setSelectedPlace(null);
    } catch (error) {
      console.error('Failed to delete place:', error);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPlace(null);
    setClickedPosition(null);
  };

  const handleFormSave = () => {
    loadData();
    handleFormClose();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="place-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            fill={star <= rating ? '#dc9e33' : 'none'}
            color={star <= rating ? '#dc9e33' : '#ccc'}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="travel-loading">Loading travel map...</div>;
  }

  return (
    <div className="travel-container">
      {/* Banner with Stats Overlay */}
      <div className="travel-banner">
        <img src="/Travel.png" alt="Travel Map" />
        {stats && (
          <div className="banner-stats">
            <div className="banner-stat">
              <span className="banner-stat-value">{stats.totalPlaces ?? 0}</span>
              <span className="banner-stat-label">Places</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-value">{stats.countriesVisited ?? 0}</span>
              <span className="banner-stat-label">Countries</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-value">{stats.usStatesVisited ?? 0}</span>
              <span className="banner-stat-label">US States</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-value">{stats.totalTrips ?? 0}</span>
              <span className="banner-stat-label">Trips</span>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="travel-header">
        <div className="travel-actions">
          <button
            className={`view-toggle ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            <MapIcon size={18} />
            Map
          </button>
          <button
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={18} />
            List
          </button>
          <button
            className={`view-toggle ${viewMode === 'trips' ? 'active' : ''}`}
            onClick={() => setViewMode('trips')}
          >
            <Briefcase size={18} />
            Trips
          </button>
          <button className="add-place-btn" onClick={handleAddPlace}>
            <Plus size={18} />
            Add Place
          </button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="map-wrapper">
          <MapContainer
            center={[39.8283, -98.5795]} // Center of US
            zoom={4}
            className="travel-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <SearchControl onSearchResult={handleSearchResult} />
            <MapClickHandler onMapClick={handleMapClick} />

            {places.map((place) => (
              <Marker
                key={place.id}
                position={[place.latitude, place.longitude]}
                icon={customIcon}
                eventHandlers={{
                  click: () => setSelectedPlace(place),
                }}
              >
                <Popup>
                  <div className="place-popup">
                    <h3>{place.name}</h3>
                    {place.country && (
                      <p className="place-location">
                        {place.state ? `${place.state}, ` : ''}{place.country}
                      </p>
                    )}
                    {place.visitDate && (
                      <p className="place-date">
                        <Calendar size={12} />
                        {formatDate(place.visitDate)}
                        {place.visitEndDate && ` - ${formatDate(place.visitEndDate)}`}
                      </p>
                    )}
                    {renderStars(place.rating)}
                    {place.tripName && (
                      <p className="place-trip">{place.tripName}</p>
                    )}
                    <div className="popup-actions">
                      <button onClick={() => handleEditPlace(place)}>Edit</button>
                      <button onClick={() => handleDeletePlace(place.id)} className="delete">Delete</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="map-instructions">
            Click anywhere on the map to add a place, or use the search bar
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="places-list">
          {places.length === 0 ? (
            <div className="no-places">
              <MapPin size={48} />
              <p>No places yet. Start adding your travels!</p>
            </div>
          ) : (
            places.map((place) => (
              <div key={place.id} className="place-card">
                <div className="place-card-header">
                  <h3>{place.name}</h3>
                  {renderStars(place.rating)}
                </div>
                {place.country && (
                  <p className="place-location">
                    <MapPin size={14} />
                    {place.state ? `${place.state}, ` : ''}{place.country}
                  </p>
                )}
                {place.visitDate && (
                  <p className="place-date">
                    <Calendar size={14} />
                    {formatDate(place.visitDate)}
                    {place.visitEndDate && ` - ${formatDate(place.visitEndDate)}`}
                  </p>
                )}
                {place.companions && (
                  <p className="place-companions">
                    <Users size={14} />
                    {place.companions}
                  </p>
                )}
                {place.expenses && (
                  <p className="place-expenses">
                    <DollarSign size={14} />
                    {place.expenses}
                  </p>
                )}
                {place.tripName && (
                  <p className="place-trip-name">{place.tripName}</p>
                )}
                {place.highlights && (
                  <p className="place-highlights">{place.highlights}</p>
                )}
                {place.notes && (
                  <p className="place-notes">{place.notes}</p>
                )}
                <div className="place-card-actions">
                  <button onClick={() => handleEditPlace(place)}>Edit</button>
                  <button onClick={() => handleDeletePlace(place.id)} className="delete">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Trips View */}
      {viewMode === 'trips' && (
        <div className="trips-list">
          {trips.length === 0 ? (
            <div className="no-trips">
              <Briefcase size={48} />
              <p>No trips yet. Create a trip when adding a place!</p>
            </div>
          ) : (
            trips.map((trip) => (
              <div key={trip.id} className="trip-card">
                <div className="trip-card-header">
                  <h3>{trip.name}</h3>
                  {trip.startDate && (
                    <span className="trip-dates">
                      <Calendar size={14} />
                      {formatDate(trip.startDate)}
                      {trip.endDate && ` - ${formatDate(trip.endDate)}`}
                    </span>
                  )}
                </div>
                {trip.description && (
                  <p className="trip-description">{trip.description}</p>
                )}
                <div className="trip-card-actions">
                  <button
                    className="packing-btn"
                    onClick={() => setPackingTrip(trip)}
                  >
                    <Package size={16} />
                    Packing List
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Place Form Modal */}
      {showForm && (
        <PlaceForm
          place={editingPlace}
          position={clickedPosition}
          trips={trips}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* Packing List Modal */}
      {packingTrip && (
        <PackingList
          trip={packingTrip}
          onClose={() => setPackingTrip(null)}
        />
      )}
    </div>
  );
}
