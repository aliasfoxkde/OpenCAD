import { describe, it, expect, beforeEach } from 'vitest';
import { useCADStore } from './cad-store';
import type { FeatureNode } from '../types/cad';

describe('CADStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    const { features } = useCADStore.getState();
    for (const f of features) {
      useCADStore.getState().removeFeature(f.id);
    }
    useCADStore.getState().clearSelection();
    useCADStore.getState().setActiveTool('select');
    useCADStore.getState().setSketchMode(false);
  });

  it('should start with empty features', () => {
    const state = useCADStore.getState();
    expect(state.features).toEqual([]);
    expect(state.selectedIds).toEqual([]);
    expect(state.activeTool).toBe('select');
  });

  it('should add a feature', () => {
    const feature: FeatureNode = {
      id: 'test-1',
      type: 'extrude',
      name: 'Box 1',
      parameters: { width: 2, height: 2, depth: 2 },
      dependencies: [],
      children: [],
      suppressed: false,
    };

    useCADStore.getState().addFeature(feature);
    const state = useCADStore.getState();
    expect(state.features).toHaveLength(1);
    expect(state.features[0]!.name).toBe('Box 1');
  });

  it('should remove a feature', () => {
    const feature: FeatureNode = {
      id: 'test-remove',
      type: 'extrude',
      name: 'Box Remove',
      parameters: { width: 1, height: 1, depth: 1 },
      dependencies: [],
      children: [],
      suppressed: false,
    };

    useCADStore.getState().addFeature(feature);
    expect(useCADStore.getState().features).toHaveLength(1);
    useCADStore.getState().removeFeature('test-remove');
    expect(useCADStore.getState().features).toHaveLength(0);
  });

  it('should select features', () => {
    const feature: FeatureNode = {
      id: 'test-sel',
      type: 'extrude',
      name: 'Box Sel',
      parameters: { width: 1, height: 1, depth: 1 },
      dependencies: [],
      children: [],
      suppressed: false,
    };

    useCADStore.getState().addFeature(feature);
    useCADStore.getState().select(['test-sel']);
    expect(useCADStore.getState().selectedIds).toEqual(['test-sel']);
    useCADStore.getState().clearSelection();
    expect(useCADStore.getState().selectedIds).toEqual([]);
  });

  it('should set active tool', () => {
    useCADStore.getState().setActiveTool('box');
    expect(useCADStore.getState().activeTool).toBe('box');
    useCADStore.getState().setActiveTool('select');
  });

  it('should update a feature', () => {
    const feature: FeatureNode = {
      id: 'test-update',
      type: 'extrude',
      name: 'Box Update',
      parameters: { width: 1, height: 1, depth: 1 },
      dependencies: [],
      children: [],
      suppressed: false,
    };

    useCADStore.getState().addFeature(feature);
    useCADStore.getState().updateFeature('test-update', {
      parameters: { width: 5, height: 5, depth: 5 },
    });

    const updated = useCADStore.getState().features.find((f) => f.id === 'test-update');
    expect(updated?.parameters.width).toBe(5);
  });

  it('should toggle sketch mode', () => {
    useCADStore.getState().setSketchMode(true);
    expect(useCADStore.getState().isSketchMode).toBe(true);
    useCADStore.getState().setSketchMode(false);
    expect(useCADStore.getState().isSketchMode).toBe(false);
  });

  it('should reorder features', () => {
    const f1: FeatureNode = {
      id: 'f1', type: 'extrude', name: 'First',
      parameters: {}, dependencies: [], children: [], suppressed: false,
    };
    const f2: FeatureNode = {
      id: 'f2', type: 'revolve', name: 'Second',
      parameters: {}, dependencies: [], children: [], suppressed: false,
    };

    useCADStore.getState().addFeature(f1);
    useCADStore.getState().addFeature(f2);
    expect(useCADStore.getState().features.map((f) => f.id)).toEqual(['f1', 'f2']);

    useCADStore.getState().reorderFeature('f2', 0);
    expect(useCADStore.getState().features.map((f) => f.id)).toEqual(['f2', 'f1']);
  });

  it('should suppress and unsuppress features', () => {
    const feature: FeatureNode = {
      id: 'test-supp', type: 'extrude', name: 'Box',
      parameters: {}, dependencies: [], children: [], suppressed: false,
    };

    useCADStore.getState().addFeature(feature);
    useCADStore.getState().updateFeature('test-supp', { suppressed: true });
    expect(useCADStore.getState().features[0]!.suppressed).toBe(true);

    useCADStore.getState().updateFeature('test-supp', { suppressed: false });
    expect(useCADStore.getState().features[0]!.suppressed).toBe(false);
  });
});
