import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Calendar,
  CheckSquare,
  Sparkles,
  Gamepad2,
  Receipt,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import type { Notification, NotificationType } from '../../stores/useNotificationStore';
import { NotificationSettings } from './NotificationSettings';
import './NotificationBell.css';

const iconMap: Record<NotificationType, React.ComponentType<any>> = {
  calendar_reminder: Calendar,
  task_due: CheckSquare,
  chore_due: Sparkles,
  game_overdue: Gamepad2,
  bill_due: Receipt,
  warranty_expiring: ShieldAlert,
  general_alert: Bell,
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
  onDismiss: (id: number) => void;
}

function NotificationItem({ notification, onMarkRead, onDismiss }: NotificationItemProps) {
  const Icon = iconMap[notification.type] || Bell;

  return (
    <div className={`notification-item ${notification.isRead ? 'read' : 'unread'} priority-${notification.priority}`}>
      <div className="notification-icon">
        <Icon size={18} />
      </div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
        <div className="notification-time">{formatTimeAgo(notification.createdAt)}</div>
      </div>
      <div className="notification-actions">
        {!notification.isRead && (
          <button
            className="notification-action"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
          >
            <Check size={14} />
          </button>
        )}
        <button
          className="notification-action"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
  } = useNotificationStore();

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Every minute
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        className={`notification-bell ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{displayCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-header-actions">
              <button
                className="notification-header-btn"
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={32} strokeWidth={1.5} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onDismiss={dismiss}
                />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button className="notification-footer-btn" onClick={markAllAsRead}>
                <CheckCheck size={14} />
                Mark all read
              </button>
              <button className="notification-footer-btn" onClick={dismissAll}>
                <X size={14} />
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {showSettings && (
        <NotificationSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
