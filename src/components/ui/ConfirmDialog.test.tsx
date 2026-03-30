import { describe, it, expect } from 'vitest';
import { confirm } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('should return a promise from confirm()', () => {
    const result = confirm({ title: 'Test', message: 'Test message' });
    expect(result).toBeInstanceOf(Promise);
    // Clean up — the dialog is pending, but the promise won't leak in tests
    // because the module-level state will be garbage collected
  });

  it('should accept custom labels', () => {
    // Verify options are accepted without throwing
    expect(() =>
      confirm({
        title: 'Delete?',
        message: 'Are you sure?',
        confirmLabel: 'Yes, Delete',
        cancelLabel: 'No',
        destructive: true,
      }),
    ).not.toThrow();
  });

  it('should accept non-destructive option', () => {
    expect(() =>
      confirm({
        title: 'Save?',
        message: 'Save changes?',
        destructive: false,
      }),
    ).not.toThrow();
  });

  it('should handle multiple concurrent confirms', () => {
    // Each call should return its own promise
    const p1 = confirm({ title: 'First', message: 'First message' });
    const p2 = confirm({ title: 'Second', message: 'Second message' });
    expect(p1).not.toBe(p2);
  });
});
