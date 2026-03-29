import { describe, it, expect } from 'vitest';
import { useViewStore } from '../stores/view-store';

describe('ViewStore', () => {
  it('should have correct defaults', () => {
    const state = useViewStore.getState();
    expect(state.displayMode).toBe('shaded_edges');
    expect(state.showGrid).toBe(true);
    expect(state.showAxes).toBe(true);
    expect(state.viewportLayout).toBe('single');
  });

  it('should toggle grid', () => {
    const before = useViewStore.getState().showGrid;
    useViewStore.getState().toggleGrid();
    expect(useViewStore.getState().showGrid).toBe(!before);
    useViewStore.getState().toggleGrid(); // restore
  });

  it('should toggle axes', () => {
    const before = useViewStore.getState().showAxes;
    useViewStore.getState().toggleAxes();
    expect(useViewStore.getState().showAxes).toBe(!before);
    useViewStore.getState().toggleAxes(); // restore
  });

  it('should set display mode', () => {
    useViewStore.getState().setDisplayMode('wireframe');
    expect(useViewStore.getState().displayMode).toBe('wireframe');
    useViewStore.getState().setDisplayMode('shaded_edges'); // restore
  });

  it('should set viewport layout', () => {
    useViewStore.getState().setViewportLayout('quad');
    expect(useViewStore.getState().viewportLayout).toBe('quad');
    useViewStore.getState().setViewportLayout('single'); // restore
  });
});
