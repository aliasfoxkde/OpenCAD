import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from '../../stores/view-store';
import type { DisplayMode } from '../../types/cad';

describe('DisplayModeToggle Logic', () => {
  beforeEach(() => {
    useViewStore.setState({
      displayMode: 'shaded_edges',
      showGrid: true,
      showAxes: true,
      showWireframe: false,
      showShadows: false,
    });
  });

  it('should start in shaded_edges mode by default', () => {
    expect(useViewStore.getState().displayMode).toBe('shaded_edges');
  });

  it('should switch between display modes', () => {
    const store = useViewStore.getState();
    store.setDisplayMode('wireframe');
    expect(useViewStore.getState().displayMode).toBe('wireframe');

    store.setDisplayMode('shaded');
    expect(useViewStore.getState().displayMode).toBe('shaded');

    store.setDisplayMode('shaded_edges');
    expect(useViewStore.getState().displayMode).toBe('shaded_edges');
  });

  it('should support all display modes', () => {
    const modes: DisplayMode[] = ['wireframe', 'shaded', 'shaded_edges'];
    for (const mode of modes) {
      useViewStore.getState().setDisplayMode(mode);
      expect(useViewStore.getState().displayMode).toBe(mode);
    }
  });

  it('should toggle grid', () => {
    expect(useViewStore.getState().showGrid).toBe(true);
    useViewStore.getState().toggleGrid();
    expect(useViewStore.getState().showGrid).toBe(false);
    useViewStore.getState().toggleGrid();
    expect(useViewStore.getState().showGrid).toBe(true);
  });

  it('should toggle axes', () => {
    expect(useViewStore.getState().showAxes).toBe(true);
    useViewStore.getState().toggleAxes();
    expect(useViewStore.getState().showAxes).toBe(false);
  });

  it('should toggle shadows', () => {
    expect(useViewStore.getState().showShadows).toBe(false);
    useViewStore.getState().toggleShadows();
    expect(useViewStore.getState().showShadows).toBe(true);
  });

  it('should toggle wireframe', () => {
    expect(useViewStore.getState().showWireframe).toBe(false);
    useViewStore.getState().toggleWireframe();
    expect(useViewStore.getState().showWireframe).toBe(true);
  });

  it('should handle viewport layout switching', () => {
    useViewStore.getState().setViewportLayout('quad');
    expect(useViewStore.getState().viewportLayout).toBe('quad');
    useViewStore.getState().setViewportLayout('single');
    expect(useViewStore.getState().viewportLayout).toBe('single');
  });
});
