import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { syncApi } from '../../services/api';
import './SyncButton.css';

interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncAt?: string;
}

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Load initial stats
    loadSyncStats();
  }, []);

  const loadSyncStats = async () => {
    try {
      const response = await syncApi.getSyncStats();
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
      // First, try to discover calendars (this will register them if not already done)
      try {
        await syncApi.discoverCalendars();
        console.log('Calendars discovered');
      } catch (discoverError: any) {
        // If discovery fails with auth error, show helpful message
        if (discoverError.response?.status === 401) {
          throw new Error('Please log in with Google first');
        }
        // Otherwise continue - calendars might already be discovered
        console.log('Calendar discovery skipped:', discoverError.message);
      }

      // Sync all Google calendars
      const response = await syncApi.syncAllGoogle();

      if (response.data.success) {
        const summary = response.data.data.summary;

        // Check if any calendars were actually synced
        if (summary && summary.total === 0) {
          throw new Error('No calendars found. Please log in with Google.');
        }

        setSyncStatus('success');

        // Update stats immediately with current time
        setStats(prev => ({
          ...prev,
          totalSyncs: (prev?.totalSyncs || 0) + summary.successful,
          successfulSyncs: (prev?.successfulSyncs || 0) + summary.successful,
          failedSyncs: (prev?.failedSyncs || 0) + summary.failed,
          lastSyncAt: new Date().toISOString(),
        }));

        // Then reload from server
        await loadSyncStats();

        // Call callback if provided
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
      console.error('Sync error:', error);
      setSyncStatus('error');

      // Provide helpful error messages
      let message = error.message || 'Sync failed';
      if (error.response?.status === 401) {
        message = 'Please log in with Google first';
      }
      setErrorMessage(message);

      // Reset status after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSyncTime = (timestamp?: string) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="sync-button-container">
      <button
        className={`sync-button ${syncStatus}`}
        onClick={handleSync}
        disabled={isSyncing}
      >
        <span className="sync-icon">
          {syncStatus === 'syncing' && <RefreshCw size={16} className="spinning" />}
          {syncStatus === 'success' && <CheckCircle size={16} />}
          {syncStatus === 'error' && <XCircle size={16} />}
          {syncStatus === 'idle' && <RefreshCw size={16} />}
        </span>
        <span className="sync-text">
          {syncStatus === 'syncing' && 'Syncing...'}
          {syncStatus === 'success' && 'Synced!'}
          {syncStatus === 'error' && 'Sync Failed'}
          {syncStatus === 'idle' && 'Sync Calendar'}
        </span>
      </button>

      {stats && (
        <div className="sync-stats">
          <span className="last-sync">
            Last sync: {formatLastSyncTime(stats.lastSyncAt)}
          </span>
        </div>
      )}

      {syncStatus === 'error' && errorMessage && (
        <div className="sync-error-message">{errorMessage}</div>
      )}
    </div>
  );
}
