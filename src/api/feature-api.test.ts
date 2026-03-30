import { describe, it, expect, beforeEach } from 'vitest';
import { useCADStore } from '../stores/cad-store';
import { resetUndoHistory } from '../lib/undo-history';
import {
  getFeatures,
  getFeature,
  addFeature,
  removeFeature,
  modifyFeature,
  getFeatureSummaries,
  getFeatureDetails,
  listAvailableFeatures,
  getFeatureDefaults,
} from './feature-api';
import type { FeatureNode } from '../types/cad';

function makeFeature(id: string, name: string): FeatureNode {
  return {
    id,
    type: 'extrude',
    name,
    parameters: { width: 2, height: 2, depth: 2 },
    dependencies: [],
    children: [],
    suppressed: false,
  };
}

describe('feature-api', () => {
  beforeEach(() => {
    resetUndoHistory();
    useCADStore.setState({
      features: [],
      selectedIds: [],
      dirty: false,
    });
  });

  describe('getFeatures / getFeature', () => {
    it('should return empty array when no features exist', () => {
      expect(getFeatures()).toEqual([]);
    });

    it('should return all features', () => {
      const f1 = makeFeature('a', 'Box 1');
      const f2 = makeFeature('b', 'Sphere 1');
      useCADStore.setState({ features: [f1, f2] });
      expect(getFeatures()).toHaveLength(2);
    });

    it('should get a single feature by id', () => {
      const f = makeFeature('a', 'Box 1');
      useCADStore.setState({ features: [f] });
      expect(getFeature('a')?.name).toBe('Box 1');
    });

    it('should return undefined for missing feature', () => {
      expect(getFeature('nonexistent')).toBeUndefined();
    });
  });

  describe('addFeature', () => {
    it('should add a feature and return it', () => {
      const result = addFeature('extrude', 'Test Box');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Test Box');
      expect(result.data!.type).toBe('extrude');
    });

    it('should add feature to the store', () => {
      addFeature('sphere', 'My Sphere');
      expect(useCADStore.getState().features).toHaveLength(1);
      expect(useCADStore.getState().features[0]!.type).toBe('sphere');
    });

    it('should merge custom parameters with defaults', () => {
      const result = addFeature('extrude', 'Custom Box', { width: 50 });
      expect(result.data!.parameters.width).toBe(50);
      // Other defaults should still be present
      expect(result.data!.parameters.height).toBeDefined();
    });

    it('should handle unknown feature type gracefully', () => {
      const result = addFeature('nonexistent_type' as any);
      // Should succeed with empty parameters since getDefaultParameters returns {}
      expect(result.success).toBe(true);
      expect(result.data!.parameters).toEqual({});
    });
  });

  describe('removeFeature', () => {
    it('should remove a feature', () => {
      const f = makeFeature('a', 'Box 1');
      useCADStore.setState({ features: [f] });
      const result = removeFeature('a');
      expect(result.success).toBe(true);
      expect(useCADStore.getState().features).toHaveLength(0);
    });

    it('should handle removing nonexistent feature', () => {
      const result = removeFeature('nonexistent');
      expect(result.success).toBe(true);
    });
  });

  describe('modifyFeature', () => {
    it('should update feature parameters', () => {
      const f = makeFeature('a', 'Box 1');
      useCADStore.setState({ features: [f] });
      modifyFeature('a', {
        parameters: { width: 100, height: 2, depth: 2 },
      });
      // modifyFeature calls updateFeature which mutates the store
      const updated = useCADStore.getState().features.find((feat) => feat.id === 'a');
      expect(updated?.parameters.width).toBe(100);
    });

    it('should update feature name', () => {
      const f = makeFeature('a', 'Box 1');
      useCADStore.setState({ features: [f] });
      modifyFeature('a', { name: 'Renamed Box' });
      const updated = useCADStore.getState().features.find((feat) => feat.id === 'a');
      expect(updated?.name).toBe('Renamed Box');
    });

    it('should return error for nonexistent feature', () => {
      const result = modifyFeature('nonexistent', { name: 'X' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getFeatureSummaries', () => {
    it('should return summaries for all features', () => {
      useCADStore.setState({
        features: [makeFeature('a', 'Box 1'), makeFeature('b', 'Sphere 1')],
      });
      const summaries = getFeatureSummaries();
      expect(summaries).toHaveLength(2);
      expect(summaries[0]!.id).toBe('a');
      expect(summaries[0]!.parameterCount).toBe(3);
      expect(summaries[0]!.suppressed).toBe(false);
    });
  });

  describe('getFeatureDetails', () => {
    it('should return feature with its definition', () => {
      const f = makeFeature('a', 'Box 1');
      useCADStore.setState({ features: [f] });
      const result = getFeatureDetails('a');
      expect(result.success).toBe(true);
      expect(result.data!.feature.name).toBe('Box 1');
      expect(result.data!.definition).toBeDefined();
      expect(result.data!.definition!.type).toBe('extrude');
    });

    it('should return error for missing feature', () => {
      const result = getFeatureDetails('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('listAvailableFeatures', () => {
    it('should list all registered feature types', () => {
      const available = listAvailableFeatures();
      expect(available.length).toBeGreaterThan(0);
      const types = available.map((f) => f.type);
      expect(types).toContain('extrude');
      expect(types).toContain('sphere');
      expect(types).toContain('fillet');
    });

    it('should include parameter schemas', () => {
      const available = listAvailableFeatures();
      const extrude = available.find((f) => f.type === 'extrude');
      expect(extrude!.parameters.length).toBeGreaterThan(0);
    });
  });

  describe('getFeatureDefaults', () => {
    it('should return default parameters for a known type', () => {
      const defaults = getFeatureDefaults('extrude');
      expect(defaults.width).toBeDefined();
      expect(defaults.height).toBeDefined();
    });

    it('should return empty object for unknown type', () => {
      const defaults = getFeatureDefaults('nonexistent');
      expect(defaults).toEqual({});
    });
  });
});
