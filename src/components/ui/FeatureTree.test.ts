import { describe, it, expect, beforeEach } from 'vitest';
import { useCADStore } from '../../stores/cad-store';
import { getFeatureDefinition } from '../../cad/features/feature-registry';
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

describe('FeatureTree logic', () => {
  beforeEach(() => {
    useCADStore.getState().loadFeatures([]);
  });

  it('should list features in order', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a', name: 'First' }));
    store.addFeature(makeFeature({ id: 'b', name: 'Second' }));
    store.addFeature(makeFeature({ id: 'c', name: 'Third' }));

    const features = useCADStore.getState().features;
    expect(features.map((f) => f.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('should select a feature by clicking', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a' }));
    store.addFeature(makeFeature({ id: 'b' }));

    useCADStore.getState().select(['b']);
    expect(useCADStore.getState().selectedIds).toEqual(['b']);
  });

  it('should rename a feature', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a', name: 'Old Name' }));

    useCADStore.getState().updateFeature('a', { name: 'New Name' });
    expect(useCADStore.getState().features[0]!.name).toBe('New Name');
  });

  it('should suppress/unsuppress a feature', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a', suppressed: false }));

    useCADStore.getState().updateFeature('a', { suppressed: true });
    expect(useCADStore.getState().features[0]!.suppressed).toBe(true);

    useCADStore.getState().updateFeature('a', { suppressed: false });
    expect(useCADStore.getState().features[0]!.suppressed).toBe(false);
  });

  it('should delete a feature', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a' }));
    store.addFeature(makeFeature({ id: 'b' }));

    useCADStore.getState().removeFeature('a');
    expect(useCADStore.getState().features).toHaveLength(1);
    expect(useCADStore.getState().features[0]!.id).toBe('b');
  });

  it('should reorder features via drag and drop', () => {
    const store = useCADStore.getState();
    store.addFeature(makeFeature({ id: 'a', name: 'First' }));
    store.addFeature(makeFeature({ id: 'b', name: 'Second' }));
    store.addFeature(makeFeature({ id: 'c', name: 'Third' }));

    // Move 'c' from index 2 to index 0
    useCADStore.getState().reorderFeature('c', 0);
    const features = useCADStore.getState().features;
    expect(features.map((f) => f.id)).toEqual(['c', 'a', 'b']);
  });

  it('should get feature icon from registry', () => {
    const def = getFeatureDefinition('extrude');
    expect(def).toBeDefined();
    expect(def!.icon).toBeTruthy();

    const unknownDef = getFeatureDefinition('nonexistent');
    expect(unknownDef).toBeUndefined();
  });
});
