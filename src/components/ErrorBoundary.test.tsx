import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// ErrorBoundary uses React.Component which requires a DOM environment.
// We test the static method and the class structure directly.

describe('ErrorBoundary', () => {
  it('should have getDerivedStateFromError static method', () => {
    const error = new Error('test error');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state).toEqual({ hasError: true, error });
  });

  it('should capture the error in state', () => {
    const error = new Error('boom');
    const state = ErrorBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
    expect(state.error?.message).toBe('boom');
  });
});
