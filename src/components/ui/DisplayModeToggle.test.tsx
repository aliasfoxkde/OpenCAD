/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisplayModeToggle } from './DisplayModeToggle';
import { useViewStore } from '../../stores/view-store';

describe('DisplayModeToggle', () => {
  beforeEach(() => {
    useViewStore.setState({
      displayMode: 'shaded_edges',
      showGrid: true,
      showAxes: true,
      showShadows: false,
    });
  });

  it('should render all three display mode buttons', () => {
    render(<DisplayModeToggle />);
    expect(screen.getByText('Shaded+Edges')).toBeDefined();
    expect(screen.getByText('Shaded')).toBeDefined();
    expect(screen.getByText('Wireframe')).toBeDefined();
  });

  it('should render toggle buttons', () => {
    render(<DisplayModeToggle />);
    expect(screen.getByText('Grid')).toBeDefined();
    expect(screen.getByText('Axes')).toBeDefined();
    expect(screen.getByText('Shadows')).toBeDefined();
  });

  it('should call setDisplayMode when a mode button is clicked', () => {
    const setDisplayMode = vi.spyOn(useViewStore.getState(), 'setDisplayMode');
    render(<DisplayModeToggle />);
    fireEvent.click(screen.getByText('Wireframe'));
    expect(setDisplayMode).toHaveBeenCalledWith('wireframe');
  });

  it('should call toggleGrid when Grid is clicked', () => {
    const toggleGrid = vi.spyOn(useViewStore.getState(), 'toggleGrid');
    render(<DisplayModeToggle />);
    fireEvent.click(screen.getByText('Grid'));
    expect(toggleGrid).toHaveBeenCalled();
  });

  it('should call toggleAxes when Axes is clicked', () => {
    const toggleAxes = vi.spyOn(useViewStore.getState(), 'toggleAxes');
    render(<DisplayModeToggle />);
    fireEvent.click(screen.getByText('Axes'));
    expect(toggleAxes).toHaveBeenCalled();
  });

  it('should call toggleShadows when Shadows is clicked', () => {
    const toggleShadows = vi.spyOn(useViewStore.getState(), 'toggleShadows');
    render(<DisplayModeToggle />);
    fireEvent.click(screen.getByText('Shadows'));
    expect(toggleShadows).toHaveBeenCalled();
  });
});
