import { useState, useEffect } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { kidsApi } from '../../services/api';
import { KidTrack } from './KidTrack';
import { AddKidModal } from './AddKidModal';
import { AddRewardModal } from './AddRewardModal';
import './KidsRewards.css';

interface KidReward {
  id: number;
  kidId: number;
  name: string;
  stickersRequired: number;
  isClaimed: boolean;
  claimedAt?: string;
}

interface Kid {
  id: number;
  name: string;
  avatarColor: string;
  stickerCount: number;
  rewards: KidReward[];
}

export function KidsRewards() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddKid, setShowAddKid] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [selectedKidId, setSelectedKidId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadKids();
  }, []);

  const loadKids = async () => {
    try {
      setLoading(true);
      const response = await kidsApi.getAllKids();
      if (response.data.success) {
        setKids(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load kids');
    } finally {
      setLoading(false);
    }
  };

  const handleAwardSticker = async (kidId: number) => {
    try {
      await kidsApi.awardSticker(kidId);
      loadKids();
    } catch (err) {
      console.error('Failed to award sticker:', err);
    }
  };

  const handleRemoveSticker = async (kidId: number) => {
    try {
      // Get the most recent sticker
      const response = await kidsApi.getStickers(kidId);
      const stickers = response.data.data;
      if (stickers && stickers.length > 0) {
        // Remove the most recent sticker (first in list, sorted by awarded_at desc)
        await kidsApi.removeSticker(kidId, stickers[0].id);
        loadKids();
      }
    } catch (err) {
      console.error('Failed to remove sticker:', err);
    }
  };

  const handleClaimReward = async (kidId: number, rewardId: number) => {
    try {
      await kidsApi.claimReward(kidId, rewardId);
      loadKids();
    } catch (err) {
      console.error('Failed to claim reward:', err);
    }
  };

  const handleDeleteKid = async (kidId: number) => {
    if (!confirm('Are you sure you want to remove this child?')) return;
    try {
      await kidsApi.deleteKid(kidId);
      loadKids();
    } catch (err) {
      console.error('Failed to delete kid:', err);
    }
  };

  const handleDeleteReward = async (kidId: number, rewardId: number) => {
    try {
      await kidsApi.deleteReward(kidId, rewardId);
      loadKids();
    } catch (err) {
      console.error('Failed to delete reward:', err);
    }
  };

  const openAddReward = (kidId: number) => {
    setSelectedKidId(kidId);
    setShowAddReward(true);
  };

  if (loading) {
    return (
      <div className="kids-loading">
        <div className="loading-spinner"></div>
        <p>Loading rewards...</p>
      </div>
    );
  }

  return (
    <div className="kids-page">
      <div className="kids-banner">
        <img src="/KidsRewards.png" alt="Kids Rewards" />
      </div>

      <div className="kids-header">
        <div className="header-actions">
          <button className="primary add-kid-btn" onClick={() => setShowAddKid(true)}>
            <Plus size={20} />
            Add Child
          </button>
          <button
            className={`settings-btn ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(!editMode)}
            title="Edit mode"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {kids.length === 0 ? (
        <div className="no-kids">
          <div className="no-kids-icon">🌟</div>
          <h2>No kids yet!</h2>
          <p>Add a child to start tracking their rewards</p>
          <button className="primary" onClick={() => setShowAddKid(true)}>
            <Plus size={20} />
            Add Your First Child
          </button>
        </div>
      ) : (
        <div className="kids-tracks">
          {kids.map((kid) => (
            <div key={kid.id} className="kid-track-container">
              {editMode && (
                <button
                  className="delete-kid-btn"
                  onClick={() => handleDeleteKid(kid.id)}
                  title="Remove child"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <KidTrack
                kid={kid}
                onAwardSticker={() => handleAwardSticker(kid.id)}
                onRemoveSticker={() => handleRemoveSticker(kid.id)}
                onClaimReward={(rewardId) => handleClaimReward(kid.id, rewardId)}
                onAddReward={() => openAddReward(kid.id)}
                onDeleteReward={(rewardId) => handleDeleteReward(kid.id, rewardId)}
                editMode={editMode}
              />
            </div>
          ))}
        </div>
      )}

      {showAddKid && (
        <AddKidModal
          onClose={() => setShowAddKid(false)}
          onKidAdded={loadKids}
        />
      )}

      {showAddReward && selectedKidId && (() => {
        const kid = kids.find(k => k.id === selectedKidId);
        const maxReward = kid?.rewards?.length
          ? Math.max(...kid.rewards.map(r => r.stickersRequired))
          : 0;
        const nextRewardStickers = maxReward + 10;
        return (
          <AddRewardModal
            kidId={selectedKidId}
            nextRewardStickers={nextRewardStickers}
            onClose={() => {
              setShowAddReward(false);
              setSelectedKidId(null);
            }}
            onRewardAdded={loadKids}
          />
        );
      })()}
    </div>
  );
}
