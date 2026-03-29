import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureEngine } from './feature-engine';
import type { FeatureNode } from '../../types/cad';

describe('FeatureEngine', () => {
  let engine: FeatureEngine;

  beforeEach(() => {
    engine = new FeatureEngine();
  });

  const makeFeature = (
    id: string,
    type: string,
    params: Record<string, unknown>,
    deps: string[] = [],
  ): FeatureNode => ({
    id,
    type: type as FeatureNode['type'],
    name: `Test ${id}`,
    parameters: params,
    dependencies: deps,
    children: [],
    suppressed: false,
  });

  describe('rebuildAll', () => {
    it('should evaluate a single extrude feature', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 3, depth: 4 }),
      ];

      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      expect(result.rebuildOrder).toEqual(['f1']);

      const f1Result = result.results.get('f1');
      expect(f1Result?.success).toBe(true);
      expect(f1Result?.bounds).toBeDefined();
    });

    it('should evaluate features in dependency order', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('f2', 'fillet', { radius: 0.5 }, ['f1']),
      ];

      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      expect(result.rebuildOrder).toEqual(['f1', 'f2']);
    });

    it('should skip suppressed features', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        { ...makeFeature('f2', 'sphere', { radius: 1 }), suppressed: true },
      ];

      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      expect(result.rebuildOrder).toEqual(['f1']);
    });

    it('should report validation errors for invalid parameters', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: -1, height: 2, depth: 2 }),
      ];

      const result = engine.rebuildAll(features);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('positive');
    });

    it('should report error for unknown feature type', () => {
      const features = [
        makeFeature('f1', 'nonexistent_type', {}),
      ];

      const result = engine.rebuildAll(features);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unknown feature type');
    });

    it('should report error for missing dependency', () => {
      const features = [
        makeFeature('f2', 'fillet', { radius: 0.5 }, ['missing_id']),
      ];

      const result = engine.rebuildAll(features);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing dependency');
    });

    it('should propagate dependency errors', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: -1, height: 2, depth: 2 }),
        makeFeature('f2', 'fillet', { radius: 0.5 }, ['f1']),
      ];

      const result = engine.rebuildAll(features);
      // f1 should fail validation, f2 should fail because f1 errored
      expect(result.errors.length).toBe(2);
      expect(result.errors[1]).toContain('has errors');
    });
  });

  describe('computeBounds', () => {
    it('should compute extrude bounds', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 4, height: 6, depth: 8 }),
      ];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -2, minY: -3, minZ: -4,
        maxX: 2, maxY: 3, maxZ: 4,
      });
    });

    it('should compute sphere bounds', () => {
      const features = [
        makeFeature('f1', 'sphere', { radius: 3 }),
      ];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -3, minY: -3, minZ: -3,
        maxX: 3, maxY: 3, maxZ: 3,
      });
    });

    it('should compute revolve bounds', () => {
      const features = [
        makeFeature('f1', 'revolve', { radius: 2, height: 4 }),
      ];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -2, minY: -2, minZ: -2,
        maxX: 2, maxY: 2, maxZ: 2,
      });
    });

    it('should compute cone bounds', () => {
      const features = [
        makeFeature('f1', 'cone', { radius: 3, height: 5 }),
      ];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -3, minY: 0, minZ: -3,
        maxX: 3, maxY: 5, maxZ: 3,
      });
    });

    it('should compute torus bounds', () => {
      const features = [
        makeFeature('f1', 'torus', { radius: 2, tube: 0.5 }),
      ];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -2.5, minY: -0.5, minZ: -2.5,
        maxX: 2.5, maxY: 0.5, maxZ: 2.5,
      });
    });

    it('should respect origin offset', () => {
      const features = [
        makeFeature('f1', 'extrude', {
          width: 2, height: 2, depth: 2,
          originX: 5, originY: 0, originZ: 0,
        }),
      ];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: 4, minY: -1, minZ: -1,
        maxX: 6, maxY: 1, maxZ: 1,
      });
    });
  });

  describe('rebuildFrom', () => {
    it('should rebuild affected features only', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('f2', 'extrude', { width: 1, height: 1, depth: 1 }),
        makeFeature('f3', 'fillet', { radius: 0.5 }, ['f1']),
      ];

      const result = engine.rebuildFrom(features, 'f1');
      expect(result.errors).toEqual([]);
      // f1 and f3 should be in the rebuild order
      expect(result.rebuildOrder).toContain('f1');
      expect(result.rebuildOrder).toContain('f3');
    });
  });

  describe('createFeature', () => {
    it('should create a feature with defaults from registry', () => {
      const feature = FeatureEngine.createFeature('extrude', 1);
      expect(feature).not.toBeNull();
      expect(feature!.type).toBe('extrude');
      expect(feature!.name).toBe('Extrude 1');
      expect(feature!.parameters.width).toBe(2);
      expect(feature!.parameters.height).toBe(2);
      expect(feature!.parameters.depth).toBe(2);
    });

    it('should create a feature with overrides', () => {
      const feature = FeatureEngine.createFeature('extrude', 2, { width: 10 });
      expect(feature!.parameters.width).toBe(10);
      expect(feature!.parameters.height).toBe(2); // default
    });

    it('should return null for unknown type', () => {
      const feature = FeatureEngine.createFeature('nonexistent', 1);
      expect(feature).toBeNull();
    });

    it('should create all primitive types', () => {
      const types = ['extrude', 'revolve', 'sphere', 'cone', 'torus'];
      for (const type of types) {
        const feature = FeatureEngine.createFeature(type, 1);
        expect(feature).not.toBeNull();
        expect(feature!.type).toBe(type);
      }
    });
  });

  describe('validation', () => {
    it('should validate revolve requires positive radius', () => {
      const features = [
        makeFeature('f1', 'revolve', { radius: -1, height: 2 }),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Radius must be positive');
    });

    it('should validate torus requires positive tube radius', () => {
      const features = [
        makeFeature('f1', 'torus', { radius: 1, tube: -0.1 }),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Tube radius must be positive');
    });

    it('should validate hole requires positive diameter and depth', () => {
      const features = [
        makeFeature('f1', 'hole', { diameter: 5, depth: -1 }),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Hole depth must be positive');
    });

    it('should validate shell requires positive thickness', () => {
      const features = [
        makeFeature('f1', 'shell', { thickness: 0 }),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Wall thickness must be positive');
    });
  });
});
