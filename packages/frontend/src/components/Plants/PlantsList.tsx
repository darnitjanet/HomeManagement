import { useState, useEffect } from 'react';
import {
  Flower2,
  Droplets,
  Plus,
  Sun,
  MapPin,
  Calendar,
  Clock,
  Trash2,
  Edit,
  History,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { plantsApi } from '../../services/api';
import { PlantForm } from './PlantForm';
import './PlantsList.css';

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

interface PlantStats {
  totalPlants: number;
  needsWaterToday: number;
  needsWaterSoon: number;
  wateredThisWeek: number;
}

export function PlantsList() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [stats, setStats] = useState<PlantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs-water' | 'needs-water-soon'>('all');
  const [wateringPlant, setWateringPlant] = useState<number | null>(null);

  useEffect(() => {
    loadPlants();
    loadStats();
  }, [filter]);

  const loadPlants = async () => {
    try {
      let response;
      if (filter === 'needs-water') {
        response = await plantsApi.getPlantsNeedingWater();
      } else if (filter === 'needs-water-soon') {
        response = await plantsApi.getPlantsNeedingWaterSoon(7);
      } else {
        response = await plantsApi.getAllPlants();
      }
      if (response.data.success) {
        setPlants(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load plants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await plantsApi.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleWaterPlant = async (plant: Plant) => {
    setWateringPlant(plant.id);
    try {
      await plantsApi.waterPlant(plant.id);
      loadPlants();
      loadStats();
    } catch (error) {
      console.error('Failed to water plant:', error);
    } finally {
      setWateringPlant(null);
    }
  };

  const handleDeletePlant = async (id: number) => {
    if (!confirm('Are you sure you want to delete this plant?')) return;
    try {
      await plantsApi.deletePlant(id);
      loadPlants();
      loadStats();
    } catch (error) {
      console.error('Failed to delete plant:', error);
    }
  };

  const getWaterStatus = (plant: Plant) => {
    if (!plant.next_water_date) return 'unknown';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWater = new Date(plant.next_water_date);
    nextWater.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((nextWater.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 2) return 'soon';
    return 'ok';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const getDaysUntilWater = (plant: Plant) => {
    if (!plant.next_water_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWater = new Date(plant.next_water_date);
    nextWater.setHours(0, 0, 0, 0);
    return Math.ceil((nextWater.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getSunlightIcon = (level: string | null) => {
    if (!level) return null;
    const lower = level.toLowerCase();
    if (lower.includes('direct') || lower.includes('full')) return '☀️';
    if (lower.includes('bright')) return '🌤️';
    if (lower.includes('medium') || lower.includes('partial')) return '⛅';
    return '🌥️';
  };

  if (loading) {
    return (
      <div className="plants-page">
        <div className="plants-loading">Loading plants...</div>
      </div>
    );
  }

  return (
    <div className="plants-page">
      <div className="plants-banner">
        <img src="/Plants.png" alt="Plants" />
      </div>

      <div className="plants-header">
        <button className="add-plant-btn" onClick={() => setShowForm(true)}>
          <Plus size={20} /> Add Plant
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="plants-stats">
          <div className="stat-card">
            <Flower2 size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.totalPlants}</span>
              <span className="stat-label">Total Plants</span>
            </div>
          </div>
          <div className="stat-card urgent">
            <AlertTriangle size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.needsWaterToday}</span>
              <span className="stat-label">Need Water Today</span>
            </div>
          </div>
          <div className="stat-card warning">
            <Clock size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.needsWaterSoon}</span>
              <span className="stat-label">Need Water Soon</span>
            </div>
          </div>
          <div className="stat-card success">
            <Check size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.wateredThisWeek}</span>
              <span className="stat-label">Watered This Week</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="plants-filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Plants
        </button>
        <button
          className={filter === 'needs-water' ? 'active' : ''}
          onClick={() => setFilter('needs-water')}
        >
          Needs Water Now
        </button>
        <button
          className={filter === 'needs-water-soon' ? 'active' : ''}
          onClick={() => setFilter('needs-water-soon')}
        >
          Needs Water Soon
        </button>
      </div>

      {/* Plants Grid */}
      {plants.length === 0 ? (
        <div className="empty-plants">
          <Flower2 size={64} />
          <h3>No plants yet!</h3>
          <p>Add your first plant to start tracking watering schedules.</p>
          <button onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Your First Plant
          </button>
        </div>
      ) : (
        <div className="plants-grid">
          {plants.map((plant) => {
            const status = getWaterStatus(plant);
            const daysUntil = getDaysUntilWater(plant);

            return (
              <div key={plant.id} className={`plant-card ${status}`}>
                <div className="plant-card-header">
                  <div className="plant-name-section">
                    <h3>{plant.name}</h3>
                    {plant.species && <span className="species">{plant.species}</span>}
                  </div>
                  <div className="plant-actions">
                    <button
                      className="edit-btn"
                      onClick={() => {
                        setEditingPlant(plant);
                        setShowForm(true);
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeletePlant(plant.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="plant-details">
                  {plant.location && (
                    <div className="detail-row">
                      <MapPin size={16} />
                      <span>{plant.location}</span>
                    </div>
                  )}
                  {plant.sunlight_needs && (
                    <div className="detail-row">
                      <span className="sunlight-icon">{getSunlightIcon(plant.sunlight_needs)}</span>
                      <span>{plant.sunlight_needs}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <Calendar size={16} />
                    <span>Every {plant.watering_frequency_days} days</span>
                  </div>
                  {plant.last_watered && (
                    <div className="detail-row">
                      <History size={16} />
                      <span>Last: {formatDate(plant.last_watered)}</span>
                    </div>
                  )}
                </div>

                <div className={`water-status ${status}`}>
                  {status === 'overdue' && (
                    <>
                      <AlertTriangle size={18} />
                      <span>Overdue by {Math.abs(daysUntil!)} days!</span>
                    </>
                  )}
                  {status === 'today' && (
                    <>
                      <Droplets size={18} />
                      <span>Water today!</span>
                    </>
                  )}
                  {status === 'soon' && (
                    <>
                      <Clock size={18} />
                      <span>Water in {daysUntil} days</span>
                    </>
                  )}
                  {status === 'ok' && (
                    <>
                      <Check size={18} />
                      <span>Next: {formatDate(plant.next_water_date)}</span>
                    </>
                  )}
                </div>

                <button
                  className="water-btn"
                  onClick={() => handleWaterPlant(plant)}
                  disabled={wateringPlant === plant.id}
                >
                  <Droplets size={18} />
                  {wateringPlant === plant.id ? 'Watering...' : 'Water Now'}
                </button>

                {plant.care_instructions && (
                  <div className="care-tip">
                    <strong>Care tip:</strong> {plant.care_instructions}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Plant Form Modal */}
      {showForm && (
        <PlantForm
          plant={editingPlant}
          onClose={() => {
            setShowForm(false);
            setEditingPlant(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingPlant(null);
            loadPlants();
            loadStats();
          }}
        />
      )}
    </div>
  );
}
