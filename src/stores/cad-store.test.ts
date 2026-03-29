import { describe, it, expect } from 'vitest';
import { useCADStore } from '../stores/cad-store';
import type { FeatureNode } from '../types/cad';

describe('CADStore', () => {
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
      id: 'test-2',
      type: 'extrude',
      name: 'Box 2',
      parameters: { width: 1, height: 1, depth: 1 },
      dependencies: [],
      children: [],
      suppressed: false,
    };

    useCADStore.getState().addFeature(feature);
    useCADStore.getState().removeFeature('test-2');
    expect(useCADStore.getState().features).toHaveLength(1); // only test-1 from prev test
  });

  it('should select features', () => {
    useCADStore.getState().select(['test-1']);
    expect(useCADStore.getState().selectedIds).toEqual(['test-1']);
    useCADStore.getState().clearSelection();
    expect(useCADStore.getState().selectedIds).toEqual([]);
  });

  it('should set active tool', () => {
    useCADStore.getState().setActiveTool('extrude');
    expect(useCADStore.getState().activeTool).toBe('extrude');
    useCADStore.getState().setActiveTool('select');
  });

  it('should update a feature', () => {
    const feature: FeatureNode = {
      id: 'test-3',
      type: 'extrude',
      name: 'Box 3',
      parameters: { width: 1, height: 1, depth: 1 },
      dependencies: [],
      children: [],
      suppressed: false,
    };

    useCADStore.getState().addFeature(feature);
    useCADStore.getState().updateFeature('test-3', {
      parameters: { width: 5, height: 5, depth: 5 },
    });

    const updated = useCADStore.getState().features.find((f) => f.id === 'test-3');
    expect(updated?.parameters.width).toBe(5);
  });

  it('should toggle sketch mode', () => {
    useCADStore.getState().setSketchMode(true);
    expect(useCADStore.getState().isSketchMode).toBe(true);
    useCADStore.getState().setSketchMode(false);
  });
});
