import { describe, it, expect, afterEach } from 'vitest';
import { useToast, type ToastType } from './Toast';

describe('Toast System', () => {
  afterEach(() => {
    useToast().clearAll();
  });

  describe('useToast hook', () => {
    it('should return addToast, removeToast, clearAll', () => {
      const toast = useToast();
      expect(toast.addToast).toBeDefined();
      expect(toast.removeToast).toBeDefined();
      expect(toast.clearAll).toBeDefined();
    });

    it('should be callable without error', () => {
      const toast = useToast();
      expect(() => toast.addToast('Test message')).not.toThrow();
      expect(() => toast.removeToast('nonexistent')).not.toThrow();
    });

    it('should accept all toast types', () => {
      const toast = useToast();
      const types: ToastType[] = ['success', 'error', 'warning', 'info'];
      for (const type of types) {
        expect(() => toast.addToast(`${type} message`, type)).not.toThrow();
      }
    });

    it('should accept custom duration', () => {
      const toast = useToast();
      expect(() => toast.addToast('Quick', 'info', 1000)).not.toThrow();
      expect(() => toast.addToast('Sticky', 'info', 0)).not.toThrow();
    });

    it('should clear all toasts without error', () => {
      const toast = useToast();
      toast.addToast('A');
      toast.addToast('B');
      expect(() => toast.clearAll()).not.toThrow();
    });
  });
});
