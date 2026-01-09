import { useState, useEffect } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { contactsApi } from '../../services/api';
import './SyncContactsButton.css';

interface SyncContactsButtonProps {
  onSyncComplete?: () => void;
}

export function SyncContactsButton({ onSyncComplete }: SyncContactsButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [stats, setStats] = useState<{
    lastSyncAt?: string;
    totalSyncs: number;
    successfulSyncs: number;
  }>({
    totalSyncs: 0,
    successfulSyncs: 0,
  });

  useEffect(() => {
    loadSyncStats();
  }, []);

  const loadSyncStats = async () => {
    try {
      const response = await contactsApi.getSyncStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    setErrorMessage('');

    try {
      const response = await contactsApi.syncContacts();

      if (response.data.success) {
        setSyncStatus('success');
        setStats((prev) => ({
          ...prev,
          lastSyncAt: new Date().toISOString(),
        }));

        // Reload stats from server
        await loadSyncStats();

        // Call completion callback
        if (onSyncComplete) {
          onSyncComplete();
        }

        // Reset status after 3 seconds
        setTimeout(() => {
          setSyncStatus('idle');
        }, 3000);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error: any) {
      setSyncStatus('error');

      // Check if it's an auth error
      if (error.response?.status === 401) {
        setErrorMessage('Please log in with Google first');
      } else {
        setErrorMessage(error.response?.data?.message || 'Sync failed');
      }

      // Reset status after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setErrorMessage('');
      }, 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSyncTime = (lastSyncAt?: string) => {
    if (!lastSyncAt) return 'Never';

    const now = new Date();
    const syncTime = new Date(lastSyncAt);
    const diffMs = now.getTime() - syncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="sync-contacts-button-container">
      <button
        className={`sync-contacts-button ${syncStatus}`}
        onClick={handleSync}
        disabled={isSyncing}
      >
        <span className="sync-icon">
          {isSyncing ? <RefreshCw size={16} className="spinning" /> : <Users size={16} />}
        </span>
        {syncStatus === 'idle' && 'Sync Contacts'}
        {syncStatus === 'syncing' && 'Syncing...'}
        {syncStatus === 'success' && 'Synced!'}
        {syncStatus === 'error' && 'Sync Failed'}
      </button>

      <div className="sync-info">
        {errorMessage ? (
          <span className="sync-error">{errorMessage}</span>
        ) : (
          <span className="last-sync">
            Last sync: {formatLastSyncTime(stats.lastSyncAt)}
          </span>
        )}
      </div>
    </div>
  );
}
