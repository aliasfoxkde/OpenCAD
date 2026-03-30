/**
 * Toast notification system.
 *
 * Provides a provider component and useToast hook for
 * imperative toast creation with auto-dismiss.
 */

import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Module-level state (works outside React tree)
let toastListeners = new Set<(toasts: Toast[]) => void>();
let activeToasts: Toast[] = [];
let toastIdCounter = 0;
let dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

function notifyListeners() {
  for (const listener of toastListeners) {
    listener([...activeToasts]);
  }
}

function removeToast(id: string) {
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
  activeToasts = activeToasts.filter((t) => t.id !== id);
  notifyListeners();
}

function addToast(message: string, type: ToastType = 'info', duration: number = 4000) {
  const id = `toast_${++toastIdCounter}`;
  const toast: Toast = { id, message, type, duration, createdAt: Date.now() };
  activeToasts = [...activeToasts, toast];
  notifyListeners();

  if (duration > 0) {
    const timer = setTimeout(() => removeToast(id), duration);
    dismissTimers.set(id, timer);
  }
}

function clearAll() {
  for (const [, timer] of dismissTimers) {
    clearTimeout(timer);
  }
  dismissTimers.clear();
  activeToasts = [];
  notifyListeners();
}

export function useToast(): Omit<ToastContextValue, 'toasts'> {
  return {
    addToast,
    removeToast,
    clearAll,
  };
}

/** Toast colors by type */
const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#064e3b', border: '#22c55e', icon: '\u2713' },
  error: { bg: '#450a0a', border: '#ef4444', icon: '\u2717' },
  warning: { bg: '#451a03', border: '#f59e0b', icon: '\u26A0' },
  info: { bg: '#0c1929', border: '#3b82f6', icon: '\u2139' },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.add(setToasts);
    return () => {
      toastListeners.delete(setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((toast) => {
        const colors = TOAST_COLORS[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              background: colors.bg,
              borderLeft: `3px solid ${colors.border}`,
            }}
            onClick={() => removeToast(toast.id)}
          >
            <span style={{ ...styles.icon, color: colors.border }}>{colors.icon}</span>
            <span style={styles.message}>{toast.message}</span>
            <button
              style={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 40,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 2000,
    maxWidth: 360,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 13,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  icon: {
    fontSize: 14,
    flexShrink: 0,
    width: 18,
    textAlign: 'center' as const,
  },
  message: {
    flex: 1,
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 16,
    cursor: 'pointer',
    padding: '0 2px',
    flexShrink: 0,
  },
};
