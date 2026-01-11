import { useState, useEffect } from 'react';
import { X, Mail, Clock, Bell, Calendar, CheckSquare, Sparkles, Gamepad2, Receipt, Send, Palmtree, Droplets, ShieldAlert } from 'lucide-react';
import { useNotificationStore, useToast } from '../../stores/useNotificationStore';
import { notificationsApi } from '../../services/api';
import './NotificationSettings.css';

interface NotificationSettingsProps {
  onClose: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { preferences, fetchPreferences, updatePreferences } = useNotificationStore();
  const toast = useToast();

  const [localPrefs, setLocalPrefs] = useState({
    digestEmail: '',
    digestEnabled: false,
    digestTime: '07:00',
    calendarReminders: true,
    taskDueAlerts: true,
    choreDueAlerts: true,
    gameOverdueAlerts: true,
    billReminders: true,
    plantWateringAlerts: true,
    warrantyExpiringAlerts: true,
    vacationMode: false,
    vacationStartDate: '',
    vacationEndDate: '',
    calendarReminderMinutes: 30,
    taskReminderMinutes: 60,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        digestEmail: preferences.digestEmail || '',
        digestEnabled: preferences.digestEnabled,
        digestTime: preferences.digestTime || '07:00',
        calendarReminders: preferences.calendarReminders,
        taskDueAlerts: preferences.taskDueAlerts,
        choreDueAlerts: preferences.choreDueAlerts,
        gameOverdueAlerts: preferences.gameOverdueAlerts,
        billReminders: preferences.billReminders,
        plantWateringAlerts: preferences.plantWateringAlerts ?? true,
        warrantyExpiringAlerts: preferences.warrantyExpiringAlerts ?? true,
        vacationMode: preferences.vacationMode || false,
        vacationStartDate: preferences.vacationStartDate || '',
        vacationEndDate: preferences.vacationEndDate || '',
        calendarReminderMinutes: preferences.calendarReminderMinutes,
        taskReminderMinutes: preferences.taskReminderMinutes,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(localPrefs);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!localPrefs.digestEmail) {
      toast.warning('Email Required', 'Please enter an email address first.');
      return;
    }

    setIsTesting(true);
    try {
      await notificationsApi.testEmail(localPrefs.digestEmail);
      toast.success('Test Email Sent', `A test email was sent to ${localPrefs.digestEmail}`);
    } catch (error: any) {
      toast.error('Test Failed', error.response?.data?.error || 'Failed to send test email');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendDigestNow = async () => {
    if (!localPrefs.digestEmail) {
      toast.warning('Email Required', 'Please enter and save an email address first.');
      return;
    }

    try {
      await notificationsApi.sendDigestNow();
      toast.success('Digest Sent', 'Daily digest email has been sent!');
    } catch (error: any) {
      toast.error('Send Failed', error.response?.data?.error || 'Failed to send digest');
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Notification Settings</h2>
          <button className="settings-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          {/* Vacation Mode Section */}
          <div className={`settings-section vacation-section ${localPrefs.vacationMode ? 'active' : ''}`}>
            <h3>
              <Palmtree size={18} />
              Vacation Mode
            </h3>
            <p className="settings-description">
              Pause all notifications while you're away. They'll resume automatically when vacation ends.
            </p>

            <div className="settings-row">
              <label className="settings-toggle vacation-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.vacationMode}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, vacationMode: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable vacation mode</span>
              </label>
            </div>

            {localPrefs.vacationMode && (
              <div className="vacation-dates">
                <div className="settings-row">
                  <label className="settings-input-label">Start Date (optional)</label>
                  <input
                    type="date"
                    className="settings-input"
                    value={localPrefs.vacationStartDate}
                    onChange={(e) =>
                      setLocalPrefs({ ...localPrefs, vacationStartDate: e.target.value })
                    }
                  />
                </div>
                <div className="settings-row">
                  <label className="settings-input-label">End Date (optional)</label>
                  <input
                    type="date"
                    className="settings-input"
                    value={localPrefs.vacationEndDate}
                    onChange={(e) =>
                      setLocalPrefs({ ...localPrefs, vacationEndDate: e.target.value })
                    }
                  />
                </div>
                <p className="vacation-note">
                  Leave dates empty to manually control when vacation mode ends.
                </p>
              </div>
            )}
          </div>

          {/* Daily Digest Section */}
          <div className="settings-section">
            <h3>
              <Mail size={18} />
              Daily Digest Email
            </h3>
            <p className="settings-description">
              Receive a morning email summary of your day's events, tasks, and reminders.
            </p>

            <div className="settings-row">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.digestEnabled}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, digestEnabled: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable daily digest</span>
              </label>
            </div>

            {localPrefs.digestEnabled && (
              <>
                <div className="settings-row">
                  <label className="settings-input-label">Email Address</label>
                  <div className="settings-input-group">
                    <input
                      type="email"
                      className="settings-input"
                      value={localPrefs.digestEmail}
                      onChange={(e) =>
                        setLocalPrefs({ ...localPrefs, digestEmail: e.target.value })
                      }
                      placeholder="your@email.com"
                    />
                    <button
                      className="settings-btn secondary"
                      onClick={handleTestEmail}
                      disabled={isTesting || !localPrefs.digestEmail}
                    >
                      {isTesting ? 'Sending...' : 'Test'}
                    </button>
                  </div>
                </div>

                <div className="settings-row">
                  <label className="settings-input-label">
                    <Clock size={14} />
                    Send Time
                  </label>
                  <input
                    type="time"
                    className="settings-input time-input"
                    value={localPrefs.digestTime}
                    onChange={(e) =>
                      setLocalPrefs({ ...localPrefs, digestTime: e.target.value })
                    }
                  />
                </div>

                <button
                  className="settings-btn send-now"
                  onClick={handleSendDigestNow}
                >
                  <Send size={14} />
                  Send Digest Now
                </button>
              </>
            )}
          </div>

          {/* Notification Types Section */}
          <div className="settings-section">
            <h3>
              <Bell size={18} />
              In-App Notifications
            </h3>
            <p className="settings-description">
              Choose which types of notifications you want to receive.
            </p>

            <div className="settings-toggles">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.calendarReminders}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, calendarReminders: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <Calendar size={16} />
                <span className="toggle-label">Calendar reminders</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.taskDueAlerts}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, taskDueAlerts: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <CheckSquare size={16} />
                <span className="toggle-label">Task due alerts</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.choreDueAlerts}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, choreDueAlerts: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <Sparkles size={16} />
                <span className="toggle-label">Chore due alerts</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.gameOverdueAlerts}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, gameOverdueAlerts: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <Gamepad2 size={16} />
                <span className="toggle-label">Game loan reminders</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.billReminders}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, billReminders: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <Receipt size={16} />
                <span className="toggle-label">Bill reminders</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.plantWateringAlerts}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, plantWateringAlerts: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <Droplets size={16} />
                <span className="toggle-label">Plant watering reminders</span>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={localPrefs.warrantyExpiringAlerts}
                  onChange={(e) =>
                    setLocalPrefs({ ...localPrefs, warrantyExpiringAlerts: e.target.checked })
                  }
                />
                <span className="toggle-slider"></span>
                <ShieldAlert size={16} />
                <span className="toggle-label">Warranty expiration alerts</span>
              </label>
            </div>
          </div>

          {/* Timing Section */}
          <div className="settings-section">
            <h3>
              <Clock size={18} />
              Reminder Timing
            </h3>
            <p className="settings-description">
              How far in advance should you be reminded?
            </p>

            <div className="settings-row">
              <label className="settings-input-label">Calendar events</label>
              <select
                className="settings-select"
                value={localPrefs.calendarReminderMinutes}
                onChange={(e) =>
                  setLocalPrefs({
                    ...localPrefs,
                    calendarReminderMinutes: parseInt(e.target.value),
                  })
                }
              >
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
              </select>
            </div>

            <div className="settings-row">
              <label className="settings-input-label">Tasks due</label>
              <select
                className="settings-select"
                value={localPrefs.taskReminderMinutes}
                onChange={(e) =>
                  setLocalPrefs({
                    ...localPrefs,
                    taskReminderMinutes: parseInt(e.target.value),
                  })
                }
              >
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
                <option value="240">4 hours before</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="settings-btn primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
