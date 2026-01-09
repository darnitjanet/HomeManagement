import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import type { Toast, ToastType } from '../../stores/useNotificationStore';
import './ToastContainer.css';

const iconMap: Record<ToastType, React.ComponentType<any>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = iconMap[toast.type];

  return (
    <div className={`toast toast-${toast.type}`}>
      <div className="toast-icon">
        <Icon size={20} />
      </div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      {toast.dismissible && (
        <button
          className="toast-close"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useNotificationStore((state) => state.toasts);
  const dismissToast = useNotificationStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
