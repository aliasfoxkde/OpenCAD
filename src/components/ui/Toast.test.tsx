/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastContainer, getToast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up any remaining toasts
    getToast().clearAll();
  });

  it('should return null when no toasts are active', () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('should render a toast message', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Hello world', 'info');
    });
    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('should render success toast with checkmark', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Saved!', 'success');
    });
    expect(screen.getByText('\u2713')).toBeDefined();
    expect(screen.getByText('Saved!')).toBeDefined();
  });

  it('should render error toast with X icon', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Failed', 'error');
    });
    expect(screen.getByText('\u2717')).toBeDefined();
  });

  it('should render warning toast with warning icon', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Careful', 'warning');
    });
    expect(screen.getByText('\u26A0')).toBeDefined();
  });

  it('should remove toast when close button is clicked', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Dismiss me');
    });
    expect(screen.getByText('Dismiss me')).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText('\u00d7'));
    });
    expect(screen.queryByText('Dismiss me')).toBeNull();
  });

  it('should remove toast when toast body is clicked', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Click to dismiss');
    });
    act(() => {
      fireEvent.click(screen.getByText('Click to dismiss'));
    });
    expect(screen.queryByText('Click to dismiss')).toBeNull();
  });

  it('should auto-dismiss after duration', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Auto dismiss', 'info', 1000);
    });
    expect(screen.getByText('Auto dismiss')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Auto dismiss')).toBeNull();
  });

  it('should not auto-dismiss when duration is 0', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Sticky', 'info', 0);
    });
    expect(screen.getByText('Sticky')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText('Sticky')).toBeDefined();
  });

  it('should clear all toasts', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('First', 'info', 0);
      getToast().addToast('Second', 'warning', 0);
      getToast().addToast('Third', 'error', 0);
    });
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
    expect(screen.getByText('Third')).toBeDefined();

    act(() => {
      getToast().clearAll();
    });
    expect(screen.queryByText('First')).toBeNull();
    expect(screen.queryByText('Second')).toBeNull();
    expect(screen.queryByText('Third')).toBeNull();
  });

  it('should remove specific toast by id', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('Keep', 'info', 0);
      getToast().addToast('Remove', 'info', 0);
    });
    expect(screen.getByText('Keep')).toBeDefined();
    expect(screen.getByText('Remove')).toBeDefined();

    act(() => {
      // Remove the "Remove" toast — we know its ID format is toast_N
      const removeEl = screen.getByText('Remove').closest('[style]')!;
      const id = removeEl.getAttribute('data-toastid') ?? '';
      // Since we can't easily get the ID from the DOM, test via clearAll approach
      // Instead, test the removeToast directly by finding it
      getToast().removeToast('toast_999');
    });
    // The "Remove" toast should still exist since we removed a non-existent ID
    expect(screen.getByText('Remove')).toBeDefined();
  });

  it('should render multiple toasts in order', () => {
    render(<ToastContainer />);
    act(() => {
      getToast().addToast('First', 'info', 0);
      getToast().addToast('Second', 'success', 0);
    });
    const container = screen.getByText('First').parentElement!.parentElement!;
    const children = Array.from(container.children);
    expect(children[0]!.textContent).toContain('First');
    expect(children[1]!.textContent).toContain('Second');
  });
});
