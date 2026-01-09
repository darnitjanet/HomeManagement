import { Star, Check } from 'lucide-react';
import './KidTrack.css';

interface KidReward {
  id: number;
  name: string;
  stickersRequired: number;
  isClaimed: boolean;
}

interface Kid {
  id: number;
  name: string;
  avatarColor: string;
  stickerCount: number;
  rewards: KidReward[];
}

interface KidTrackProps {
  kid: Kid;
  onAwardSticker: () => void;
  onRemoveSticker: () => void;
  onClaimReward: (rewardId: number) => void;
  onAddReward: () => void;
  onDeleteReward: (rewardId: number) => void;
  editMode: boolean;
}

const STICKERS_PER_REWARD = 10;

export function KidTrack({
  kid,
  onAwardSticker,
  onRemoveSticker,
  onClaimReward,
  onAddReward,
}: KidTrackProps) {
  // Sort rewards by stickers required
  const sortedRewards = [...(kid.rewards || [])].sort(
    (a, b) => a.stickersRequired - b.stickersRequired
  );

  // Find the current/next reward to work toward
  const nextUnclaimedReward = sortedRewards.find((r) => !r.isClaimed);
  const stickersTowardNext = kid.stickerCount % STICKERS_PER_REWARD;
  const canClaimReward = nextUnclaimedReward && nextUnclaimedReward.stickersRequired <= kid.stickerCount;

  // Build sticker spots
  const stickerSpots = [];
  for (let i = 1; i <= STICKERS_PER_REWARD; i++) {
    stickerSpots.push({
      position: i,
      isEarned: i <= stickersTowardNext || (stickersTowardNext === 0 && canClaimReward),
      isNextSpot: i === stickersTowardNext + 1 && !canClaimReward,
      isLastEarned: i === stickersTowardNext && stickersTowardNext > 0,
    });
  }

  const handleStickerClick = (spot: { isNextSpot: boolean; isLastEarned: boolean }) => {
    if (spot.isNextSpot) {
      onAwardSticker();
    } else if (spot.isLastEarned) {
      onRemoveSticker();
    }
  };

  const handleRewardClick = () => {
    if (canClaimReward && nextUnclaimedReward) {
      onClaimReward(nextUnclaimedReward.id);
    } else if (!nextUnclaimedReward) {
      onAddReward();
    }
  };

  return (
    <div className="kid-track">
      <div className="kid-header">
        <div
          className="kid-avatar"
          style={{ backgroundColor: kid.avatarColor }}
        >
          {kid.name.charAt(0).toUpperCase()}
        </div>
        <div className="kid-info">
          <h2 className="kid-name">{kid.name}</h2>
          <p className="sticker-count">
            <Star size={16} className="star-icon filled" />
            {kid.stickerCount} sticker{kid.stickerCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Single row: stickers + reward */}
      <div
        className="track-row"
        style={{ '--track-color': kid.avatarColor } as React.CSSProperties}
      >
        {stickerSpots.map((spot) => {
          const isClickable = spot.isNextSpot || spot.isLastEarned;
          return (
            <div
              key={spot.position}
              className={`spot-circle ${spot.isEarned ? 'earned' : ''} ${
                spot.isNextSpot ? 'next-spot' : ''
              } ${spot.isLastEarned ? 'last-earned' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => handleStickerClick(spot)}
            >
              {spot.isEarned ? (
                <Star size={20} className="star-icon" />
              ) : (
                <span className="spot-number">{spot.position}</span>
              )}
            </div>
          );
        })}

        {/* Reward oval */}
        <div
          className={`reward-oval ${canClaimReward ? 'can-claim' : ''} ${
            nextUnclaimedReward ? '' : 'empty'
          }`}
          onClick={handleRewardClick}
        >
          {canClaimReward && <Check size={18} className="check-icon" />}
          <span className="reward-text">
            {nextUnclaimedReward ? nextUnclaimedReward.name : 'Add Reward'}
          </span>
        </div>
      </div>

      {/* Claimed rewards summary */}
      {sortedRewards.filter(r => r.isClaimed).length > 0 && (
        <div className="claimed-rewards">
          <span className="claimed-label">Claimed:</span>
          {sortedRewards.filter(r => r.isClaimed).map((r) => (
            <span key={r.id} className="claimed-badge">{r.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
