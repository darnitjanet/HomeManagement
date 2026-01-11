import { useState, useEffect } from 'react';
import { X, Flower2, Loader2 } from 'lucide-react';
import { plantsApi } from '../../services/api';

interface Plant {
  id: number;
  name: string;
  species: string | null;
  location: string | null;
  watering_frequency_days: number;
  last_watered: string | null;
  next_water_date: string | null;
  sunlight_needs: string | null;
  image_url: string | null;
  notes: string | null;
  care_instructions: string | null;
  is_active: boolean;
}

interface PlantFormProps {
  plant: Plant | null;
  onClose: () => void;
  onSaved: () => void;
}

const SUNLIGHT_OPTIONS = [
  'Low',
  'Low to Medium',
  'Medium',
  'Medium to Bright',
  'Bright Indirect',
  'Bright Direct',
  'Full Sun',
];

const LOCATION_SUGGESTIONS = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Office',
  'Dining Room',
  'Hallway',
  'Porch',
  'Balcony',
  'Garden',
  'Window Sill',
];

export function PlantForm({ plant, onClose, onSaved }: PlantFormProps) {
  const [name, setName] = useState(plant?.name || '');
  const [species, setSpecies] = useState(plant?.species || '');
  const [location, setLocation] = useState(plant?.location || '');
  const [wateringFrequency, setWateringFrequency] = useState(
    plant?.watering_frequency_days?.toString() || '7'
  );
  const [lastWatered, setLastWatered] = useState(plant?.last_watered || '');
  const [sunlightNeeds, setSunlightNeeds] = useState(plant?.sunlight_needs || '');
  const [notes, setNotes] = useState(plant?.notes || '');
  const [careInstructions, setCareInstructions] = useState(plant?.care_instructions || '');

  const [commonSpecies, setCommonSpecies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSpeciesSuggestions, setShowSpeciesSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  useEffect(() => {
    loadCommonSpecies();
  }, []);

  const loadCommonSpecies = async () => {
    try {
      const response = await plantsApi.getCommonSpecies();
      if (response.data.success) {
        setCommonSpecies(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load species:', error);
    }
  };

  const handleSpeciesSelect = async (selectedSpecies: string) => {
    setSpecies(selectedSpecies);
    setShowSpeciesSuggestions(false);

    // Load care suggestion for this species
    try {
      const response = await plantsApi.getCareSuggestion(selectedSpecies);
      if (response.data.success && response.data.data) {
        const suggestion = response.data.data;
        setWateringFrequency(suggestion.frequency.toString());
        setSunlightNeeds(suggestion.sunlight);
        setCareInstructions(suggestion.care);
      }
    } catch (error) {
      console.error('Failed to load care suggestion:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Plant name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = {
        name: name.trim(),
        species: species.trim() || null,
        location: location.trim() || null,
        watering_frequency_days: parseInt(wateringFrequency) || 7,
        last_watered: lastWatered || null,
        sunlight_needs: sunlightNeeds || null,
        notes: notes.trim() || null,
        care_instructions: careInstructions.trim() || null,
      };

      if (plant) {
        await plantsApi.updatePlant(plant.id, data);
      } else {
        await plantsApi.createPlant(data);
      }

      onSaved();
    } catch (error: any) {
      console.error('Failed to save plant:', error);
      setError(error.response?.data?.message || 'Failed to save plant');
    } finally {
      setSaving(false);
    }
  };

  const filteredSpecies = commonSpecies.filter((s) =>
    s.toLowerCase().includes(species.toLowerCase())
  );

  const filteredLocations = LOCATION_SUGGESTIONS.filter((l) =>
    l.toLowerCase().includes(location.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="plant-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Flower2 size={24} />
            {plant ? 'Edit Plant' : 'Add Plant'}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Plant Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kitchen Pothos, My Snake Plant"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Species / Type</label>
            <div className="autocomplete-wrapper">
              <input
                type="text"
                value={species}
                onChange={(e) => {
                  setSpecies(e.target.value);
                  setShowSpeciesSuggestions(true);
                }}
                onFocus={() => setShowSpeciesSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSpeciesSuggestions(false), 200)}
                placeholder="e.g., Pothos, Snake Plant, Monstera"
              />
              {showSpeciesSuggestions && filteredSpecies.length > 0 && (
                <ul className="suggestions-list">
                  {filteredSpecies.map((s) => (
                    <li key={s} onClick={() => handleSpeciesSelect(s)}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <small>Select a known species to auto-fill care recommendations</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <div className="autocomplete-wrapper">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  placeholder="e.g., Living Room, Kitchen"
                />
                {showLocationSuggestions && filteredLocations.length > 0 && (
                  <ul className="suggestions-list">
                    {filteredLocations.map((l) => (
                      <li
                        key={l}
                        onClick={() => {
                          setLocation(l);
                          setShowLocationSuggestions(false);
                        }}
                      >
                        {l}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Sunlight Needs</label>
              <select
                value={sunlightNeeds}
                onChange={(e) => setSunlightNeeds(e.target.value)}
              >
                <option value="">Select light level...</option>
                {SUNLIGHT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Water Every (days)</label>
              <input
                type="number"
                value={wateringFrequency}
                onChange={(e) => setWateringFrequency(e.target.value)}
                min="1"
                max="90"
              />
            </div>

            <div className="form-group">
              <label>Last Watered</label>
              <input
                type="date"
                value={lastWatered}
                onChange={(e) => setLastWatered(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Care Instructions</label>
            <textarea
              value={careInstructions}
              onChange={(e) => setCareInstructions(e.target.value)}
              placeholder="Any special care tips for this plant..."
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes about this plant..."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={18} className="spinner" /> Saving...
                </>
              ) : (
                <>{plant ? 'Update Plant' : 'Add Plant'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
