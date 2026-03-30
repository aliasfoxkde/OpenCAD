import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from './view-store';

describe('ViewStore', () => {
  beforeEach(() => {
    useViewStore.setState({
      displayMode: 'shaded_edges',
      viewportLayout: 'single',
      showGrid: true,
      showAxes: true,
      showWireframe: false,
      showShadows: false,
    });
  });

  it('should have correct defaults', () => {
    const state = useViewStore.getState();
    expect(state.displayMode).toBe('shaded_edges');
    expect(state.showGrid).toBe(true);
    expect(state.showAxes).toBe(true);
    expect(state.viewportLayout).toBe('single');
  });

  it('should toggle grid', () => {
    expect(useViewStore.getState().showGrid).toBe(true);
    useViewStore.getState().toggleGrid();
    expect(useViewStore.getState().showGrid).toBe(false);
  });

  it('should toggle axes', () => {
    expect(useViewStore.getState().showAxes).toBe(true);
    useViewStore.getState().toggleAxes();
    expect(useViewStore.getState().showAxes).toBe(false);
  });

  it('should set display mode', () => {
    useViewStore.getState().setDisplayMode('wireframe');
    expect(useViewStore.getState().displayMode).toBe('wireframe');
  });

  it('should increment fitViewRequested counter', () => {
    expect(useViewStore.getState().fitViewRequested).toBe(0);
    useViewStore.getState().requestFitView();
    expect(useViewStore.getState().fitViewRequested).toBe(1);
    useViewStore.getState().requestFitView();
    expect(useViewStore.getState().fitViewRequested).toBe(2);
  });

  it('should increment zoomToSelectionRequested counter', () => {
    expect(useViewStore.getState().zoomToSelectionRequested).toBe(0);
    useViewStore.getState().requestZoomToSelection();
    expect(useViewStore.getState().zoomToSelectionRequested).toBe(1);
    useViewStore.getState().requestZoomToSelection();
    expect(useViewStore.getState().zoomToSelectionRequested).toBe(2);
  });
});
