/**
 * Confirmation dialog system.
 *
 * Provides an imperative `confirm()` function and a React component
 * for destructive action confirmation.
 */

import { useState, useEffect, useCallback } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

// Module-level state
let confirmListeners = new Set<(state: ConfirmState | null) => void>();
let activeState: ConfirmState | null = null;

function notifyListeners() {
  for (const listener of confirmListeners) {
    listener(activeState);
  }
}

/**
 * Show a confirmation dialog. Returns a promise that resolves to true (confirmed) or false (cancelled).
 *
 * Usage:
 *   const confirmed = await confirm({ title: 'Delete Feature?', message: 'This cannot be undone.' });
 *   if (confirmed) removeFeature(id);
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    activeState = { ...options, resolve };
    notifyListeners();
  });
}

export function ConfirmDialogContainer() {
  const [state, setState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    confirmListeners.add(setState);
    return () => {
      confirmListeners.delete(setState);
    };
  }, []);

  const handleConfirm = useCallback(() => {
    if (state) {
      activeState = null;
      state.resolve(true);
      notifyListeners();
    }
  }, [state]);

  const handleCancel = useCallback(() => {
    if (state) {
      activeState = null;
      state.resolve(false);
      notifyListeners();
    }
  }, [state]);

  // Close on Escape
  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, handleCancel]);

  if (!state) return null;

  const isDestructive = state.destructive !== false;

  return (
    <div style={styles.overlay} onClick={handleCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.title}>{state.title}</div>
        <div style={styles.message}>{state.message}</div>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={handleCancel}>
            {state.cancelLabel ?? 'Cancel'}
          </button>
          <button
            style={{
              ...styles.confirmBtn,
              ...(isDestructive ? styles.destructiveBtn : {}),
            }}
            onClick={handleConfirm}
            autoFocus
          >
            {state.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
  },
  dialog: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: 20,
    minWidth: 320,
    maxWidth: 420,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: 20,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    padding: '6px 16px',
    borderRadius: 4,
    border: '1px solid #475569',
    background: 'transparent',
    color: '#e2e8f0',
    fontSize: 13,
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '6px 16px',
    borderRadius: 4,
    border: '1px solid #3b82f6',
    background: '#3b82f6',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
  destructiveBtn: {
    borderColor: '#ef4444',
    background: '#ef4444',
  },
};
