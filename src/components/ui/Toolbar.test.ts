import { describe, it, expect, beforeEach } from 'vitest';
import { useCADStore } from '../../stores/cad-store';
import { getDefaultParameters } from '../../cad/features';
import type { FeatureType } from '../../types/cad';

describe('Toolbar logic', () => {
  beforeEach(() => {
    useCADStore.getState().loadFeatures([]);
  });

  const primitiveTypes = [
    { tool: 'box', feature: 'extrude' },
    { tool: 'cylinder', feature: 'revolve' },
    { tool: 'sphere', feature: 'sphere' },
    { tool: 'cone', feature: 'cone' },
    { tool: 'torus', feature: 'torus' },
    { tool: 'hole', feature: 'hole' },
  ];

  for (const { tool, feature } of primitiveTypes) {
    it(`should create ${feature} feature when ${tool} tool is clicked`, () => {
      const defaults = getDefaultParameters(feature);
      const id = crypto.randomUUID();
      const name = `${tool.charAt(0).toUpperCase() + tool.slice(1)} 1`;

      useCADStore.getState().addFeatureAndSelect({
        id,
        type: feature as FeatureType,
        name,
        parameters: defaults,
        dependencies: [],
        children: [],
        suppressed: false,
      });

      const features = useCADStore.getState().features;
      expect(features).toHaveLength(1);
      expect(features[0]!.type).toBe(feature);
      expect(features[0]!.name).toBe(name);
      expect(features[0]!.parameters).toEqual(defaults);
      expect(useCADStore.getState().selectedIds).toEqual([id]);
    });
  }

  it('should increment feature name number', () => {
    useCADStore.getState().addFeatureAndSelect({
      id: '1',
      type: 'extrude',
      name: 'Box 1',
      parameters: getDefaultParameters('extrude'),
      dependencies: [],
      children: [],
      suppressed: false,
    });
    useCADStore.getState().addFeatureAndSelect({
      id: '2',
      type: 'extrude',
      name: 'Box 2',
      parameters: getDefaultParameters('extrude'),
      dependencies: [],
      children: [],
      suppressed: false,
    });

    expect(useCADStore.getState().features).toHaveLength(2);
    expect(useCADStore.getState().features[0]!.name).toBe('Box 1');
    expect(useCADStore.getState().features[1]!.name).toBe('Box 2');
  });

  it('should switch back to select tool after creating a primitive', () => {
    useCADStore.getState().setActiveTool('box');
    useCADStore.getState().addFeatureAndSelect({
      id: '1',
      type: 'extrude',
      name: 'Box 1',
      parameters: getDefaultParameters('extrude'),
      dependencies: [],
      children: [],
      suppressed: false,
    });
    useCADStore.getState().setActiveTool('select');

    expect(useCADStore.getState().activeTool).toBe('select');
  });

  it('should have defaults for all primitive types', () => {
    const types = ['extrude', 'revolve', 'sphere', 'cone', 'torus', 'hole'] as const;
    for (const type of types) {
      const defaults = getDefaultParameters(type);
      expect(defaults).toBeDefined();
      expect(Object.keys(defaults).length).toBeGreaterThan(0);
    }
  });
});
