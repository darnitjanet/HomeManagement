import { create } from 'zustand';
import { notificationsApi } from '../services/api';

// Types
export type NotificationType =
  | 'calendar_reminder'
  | 'task_due'
  | 'chore_due'
  | 'game_overdue'
  | 'bill_due'
  | 'warranty_expiring'
  | 'plant_watering'
  | 'birthday_reminder'
  | 'package_delivery'
  | 'seasonal_task'
  | 'appointment_reminder'
  | 'general_alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  priority: NotificationPriority;
  entityType?: string;
  entityId?: number;
  isRead: boolean;
  isDismissed: boolean;
  scheduledFor?: string;
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationPreferences {
  id: number;
  digestEmail?: string;
  digestEnabled: boolean;
  digestTime: string;
  calendarReminders: boolean;
  taskDueAlerts: boolean;
  choreDueAlerts: boolean;
  gameOverdueAlerts: boolean;
  billReminders: boolean;
  warrantyExpiringAlerts: boolean;
  plantWateringAlerts: boolean;
  birthdayReminders: boolean;
  ttsEnabled: boolean;
  ttsVolume: number;
  motionDetectionEnabled: boolean;
  vacationMode: boolean;
  vacationStartDate?: string;
  vacationEndDate?: string;
  calendarReminderMinutes: number;
  taskReminderMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 5000
  dismissible?: boolean;
}

interface NotificationStore {
  // State
  notifications: Notification[];
  unreadCount: number;
  toasts: Toast[];
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;

  // Notification actions
  fetchNotifications: (includeRead?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: number) => Promise<void>;
  dismissAll: () => Promise<void>;

  // Toast actions
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Preferences actions
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;

  // Utility actions
  setError: (error: string | null) => void;
  clearNotifications: () => void;
}

// Generate unique toast ID
let toastIdCounter = 0;
const generateToastId = () => `toast-${++toastIdCounter}-${Date.now()}`;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  toasts: [],
  preferences: null,
  isLoading: false,
  error: null,

  // Fetch all notifications
  fetchNotifications: async (includeRead = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationsApi.getAll(includeRead);
      set({
        notifications: response.data.data || [],
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch notifications',
        isLoading: false,
      });
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      set({ unreadCount: response.data.data?.count || 0 });
    } catch (error: any) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  // Mark single notification as read
  markAsRead: async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to mark as read' });
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to mark all as read' });
    }
  },

  // Dismiss single notification
  dismiss: async (id: number) => {
    try {
      await notificationsApi.dismiss(id);
      const notification = get().notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.isRead;
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to dismiss notification' });
    }
  },

  // Dismiss all notifications
  dismissAll: async () => {
    try {
      await notificationsApi.dismissAll();
      set({ notifications: [], unreadCount: 0 });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to dismiss all' });
    }
  },

  // Show a toast notification
  showToast: (toast) => {
    const id = generateToastId();
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, newToast.duration);
    }
  },

  // Dismiss a toast
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Fetch preferences
  fetchPreferences: async () => {
    try {
      const response = await notificationsApi.getPreferences();
      set({ preferences: response.data.data });
    } catch (error: any) {
      console.error('Failed to fetch preferences:', error);
    }
  },

  // Update preferences
  updatePreferences: async (prefs) => {
    try {
      const response = await notificationsApi.updatePreferences(prefs);
      set({ preferences: response.data.data });
      get().showToast({
        type: 'success',
        title: 'Preferences Saved',
        message: 'Your notification preferences have been updated.',
      });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update preferences' });
      get().showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save preferences. Please try again.',
      });
    }
  },

  // Set error
  setError: (error) => set({ error }),

  // Clear all notifications from state
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));

// Helper hook to show different toast types
export const useToast = () => {
  const showToast = useNotificationStore((state) => state.showToast);

  return {
    info: (title: string, message?: string) =>
      showToast({ type: 'info', title, message }),
    success: (title: string, message?: string) =>
      showToast({ type: 'success', title, message }),
    warning: (title: string, message?: string) =>
      showToast({ type: 'warning', title, message }),
    error: (title: string, message?: string) =>
      showToast({ type: 'error', title, message }),
  };
};
