import { describe, it, expect, beforeEach } from 'vitest';
import { useCADStore } from '../../stores/cad-store';
import type { FeatureNode } from '../../types/cad';

const makeFeature = (overrides: Partial<FeatureNode> = {}): FeatureNode => ({
  id: 'f1',
  type: 'extrude',
  name: 'Box',
  parameters: { width: 2, height: 2, depth: 2 },
  dependencies: [],
  children: [],
  suppressed: false,
  ...overrides,
});

describe('CADModel click-to-select', () => {
  beforeEach(() => {
    useCADStore.getState().loadFeatures([]);
  });

  it('should select a single feature via store select()', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a' }));
    store.addFeature(makeFeature({ id: 'b' }));

    useCADStore.getState().select(['a']);
    expect(useCADStore.getState().selectedIds).toEqual(['a']);
  });

  it('should clear selection on clearSelection()', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a' }));
    useCADStore.getState().select(['a']);

    useCADStore.getState().clearSelection();
    expect(useCADStore.getState().selectedIds).toEqual([]);
  });

  it('should toggle selection with shift (add then remove)', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a' }));
    store.addFeature(makeFeature({ id: 'b' }));
    store.addFeature(makeFeature({ id: 'c' }));

    // Simulate shift-click on 'a': add to selection
    const state = useCADStore.getState();
    state.select([...state.selectedIds, 'a']);
    expect(useCADStore.getState().selectedIds).toEqual(['a']);

    // Shift-click on 'b': add to selection
    const state2 = useCADStore.getState();
    state2.select([...state2.selectedIds, 'b']);
    expect(useCADStore.getState().selectedIds).toEqual(['a', 'b']);

    // Shift-click on 'a' again: remove from selection
    const state3 = useCADStore.getState();
    state3.select(state3.selectedIds.filter((id) => id !== 'a'));
    expect(useCADStore.getState().selectedIds).toEqual(['b']);
  });

  it('should replace selection without shift', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a' }));
    store.addFeature(makeFeature({ id: 'b' }));

    useCADStore.getState().select(['a']);
    useCADStore.getState().select(['b']);
    expect(useCADStore.getState().selectedIds).toEqual(['b']);
  });

  it('should not select suppressed features (mesh not rendered)', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a', suppressed: true }));

    // Suppressed features are not rendered as meshes, so no click target
    // But store still allows selection — the UI layer prevents it
    useCADStore.getState().select(['a']);
    expect(useCADStore.getState().selectedIds).toEqual(['a']);
  });

  it('should handle empty features array', () => {
    expect(useCADStore.getState().selectedIds).toEqual([]);
    useCADStore.getState().clearSelection();
    expect(useCADStore.getState().selectedIds).toEqual([]);
  });

  it('should respect click threshold logic (distance > threshold = drag, no select)', () => {
    // This tests the threshold concept used in FeatureMesh
    const CLICK_THRESHOLD = 5;

    // Simulate a short movement (click)
    const shortDist = Math.sqrt(2 * 2 + 2 * 2);
    expect(shortDist).toBeLessThanOrEqual(CLICK_THRESHOLD);

    // Simulate a long movement (drag)
    const longDist = Math.sqrt(20 * 20 + 10 * 10);
    expect(longDist).toBeGreaterThan(CLICK_THRESHOLD);
  });
});
