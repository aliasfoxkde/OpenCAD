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
      const features = [makeFeature('f1', 'extrude', { width: 2, height: 3, depth: 4 })];

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
      const features = [makeFeature('f1', 'extrude', { width: -1, height: 2, depth: 2 })];

      const result = engine.rebuildAll(features);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('positive');
    });

    it('should report error for unknown feature type', () => {
      const features = [makeFeature('f1', 'nonexistent_type', {})];

      const result = engine.rebuildAll(features);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unknown feature type');
    });

    it('should report error for missing dependency', () => {
      const features = [makeFeature('f2', 'fillet', { radius: 0.5 }, ['missing_id'])];

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
      const features = [makeFeature('f1', 'extrude', { width: 4, height: 6, depth: 8 })];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -2,
        minY: -3,
        minZ: -4,
        maxX: 2,
        maxY: 3,
        maxZ: 4,
      });
    });

    it('should compute sphere bounds', () => {
      const features = [makeFeature('f1', 'sphere', { radius: 3 })];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -3,
        minY: -3,
        minZ: -3,
        maxX: 3,
        maxY: 3,
        maxZ: 3,
      });
    });

    it('should compute revolve bounds', () => {
      const features = [makeFeature('f1', 'revolve', { radius: 2, height: 4 })];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -2,
        minY: -2,
        minZ: -2,
        maxX: 2,
        maxY: 2,
        maxZ: 2,
      });
    });

    it('should compute cone bounds', () => {
      const features = [makeFeature('f1', 'cone', { radius: 3, height: 5 })];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -3,
        minY: 0,
        minZ: -3,
        maxX: 3,
        maxY: 5,
        maxZ: 3,
      });
    });

    it('should compute torus bounds', () => {
      const features = [makeFeature('f1', 'torus', { radius: 2, tube: 0.5 })];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -2.5,
        minY: -0.5,
        minZ: -2.5,
        maxX: 2.5,
        maxY: 0.5,
        maxZ: 2.5,
      });
    });

    it('should respect origin offset', () => {
      const features = [
        makeFeature('f1', 'extrude', {
          width: 2,
          height: 2,
          depth: 2,
          originX: 5,
          originY: 0,
          originZ: 0,
        }),
      ];

      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: 4,
        minY: -1,
        minZ: -1,
        maxX: 6,
        maxY: 1,
        maxZ: 1,
      });
    });

    it('should compute fillet bounds', () => {
      const features = [makeFeature('f1', 'fillet', { radius: 2 })];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -2,
        minY: -2,
        minZ: -2,
        maxX: 2,
        maxY: 2,
        maxZ: 2,
      });
    });

    it('should compute chamfer bounds', () => {
      const features = [makeFeature('f1', 'chamfer', { distance: 1.5, angle: 45 })];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -1.5,
        minY: -1.5,
        minZ: -1.5,
        maxX: 1.5,
        maxY: 1.5,
        maxZ: 1.5,
      });
    });

    it('should compute shell bounds from target body', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 4, height: 6, depth: 2 }),
        makeFeature('s1', 'shell', { targetRef: 'f1', thickness: 1 }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('s1')?.bounds;
      // Shell bounds should match the target body's bounds
      const targetBounds = result.results.get('f1')?.bounds;
      expect(bounds).toBeDefined();
      expect(bounds!.minX).toBeCloseTo(targetBounds!.minX);
      expect(bounds!.maxX).toBeCloseTo(targetBounds!.maxX);
      expect(bounds!.minY).toBeCloseTo(targetBounds!.minY);
      expect(bounds!.maxY).toBeCloseTo(targetBounds!.maxY);
    });

    it('should compute hole bounds', () => {
      const features = [makeFeature('f1', 'hole', { diameter: 6, depth: 10 })];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('f1')?.bounds;
      expect(bounds).toEqual({
        minX: -3,
        minY: 0,
        minZ: -3,
        maxX: 3,
        maxY: 10,
        maxZ: 3,
      });
    });

    it('should compute linear pattern bounds along x', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('p1', 'pattern_linear', { featureRef: 'f1', count: 4, spacing: 5, direction: 'x' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('p1')?.bounds;
      expect(bounds).toBeDefined();
      expect(bounds!.maxX).toBe(15); // (4-1) * 5
      expect(bounds!.minX).toBe(0);
    });

    it('should compute linear pattern bounds along y', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('p1', 'pattern_linear', { featureRef: 'f1', count: 3, spacing: 10, direction: 'y' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('p1')?.bounds;
      expect(bounds).toBeDefined();
      expect(bounds!.maxY).toBe(20); // (3-1) * 10
      expect(bounds!.minY).toBe(0);
    });

    it('should compute circular pattern bounds', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('p1', 'pattern_circular', { featureRef: 'f1', count: 6, angle: 360, axis: 'z' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('p1')?.bounds;
      expect(bounds).toBeDefined();
      // Circular patterns have symmetric bounds around origin
      expect(bounds!.minX).toBeLessThan(0);
      expect(bounds!.maxX).toBeGreaterThan(0);
    });

    it('should compute mirror bounds', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('m1', 'mirror', { featureRef: 'f1', plane: 'yz' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      const bounds = result.results.get('m1')?.bounds;
      expect(bounds).toBeDefined();
      expect(bounds!.minX).toBeLessThan(0);
      expect(bounds!.maxX).toBeGreaterThan(0);
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
      const features = [makeFeature('f1', 'revolve', { radius: -1, height: 2 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Radius must be positive');
    });

    it('should validate torus requires positive tube radius', () => {
      const features = [makeFeature('f1', 'torus', { radius: 1, tube: -0.1 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Tube radius must be positive');
    });

    it('should validate hole requires positive diameter and depth', () => {
      const features = [makeFeature('f1', 'hole', { diameter: 5, depth: -1 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Hole depth must be positive');
    });

    it('should validate shell requires positive thickness', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('s1', 'shell', { targetRef: 'f1', thickness: 0 }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Wall thickness must be positive');
    });

    it('should validate pattern_linear requires positive spacing', () => {
      const features = [makeFeature('f1', 'pattern_linear', { featureRef: 'missing', count: 3, spacing: -1 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Spacing must be positive');
    });

    it('should validate pattern_linear requires count >= 1', () => {
      const features = [makeFeature('f1', 'pattern_linear', { featureRef: 'missing', count: 0, spacing: 5 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Count must be at least 1');
    });

    it('should validate pattern_circular requires positive angle', () => {
      const features = [makeFeature('f1', 'pattern_circular', { featureRef: 'missing', count: 6, angle: 0 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Total angle must be positive');
    });

    it('should validate pattern_circular requires count >= 1', () => {
      const features = [makeFeature('f1', 'pattern_circular', { featureRef: 'missing', count: -1, angle: 360 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Count must be at least 1');
    });

    it('should validate boolean_union requires at least 2 body refs', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('b1', 'boolean_union', { bodyRefs: 'f1' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Union requires at least 2 body references');
    });

    it('should validate boolean_subtract requires tool ref', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('b1', 'boolean_subtract', { targetRef: 'f1' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Missing required parameter');
    });

    it('should validate boolean_subtract rejects same target and tool', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('b1', 'boolean_subtract', { targetRef: 'f1', toolRef: 'f1' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Target and tool must be different');
    });

    it('should validate boolean_intersect requires at least 2 body refs', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('b1', 'boolean_intersect', { bodyRefs: 'f1' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Intersect requires at least 2 body references');
    });

    it('should evaluate boolean_union with valid refs', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('f2', 'extrude', { width: 2, height: 2, depth: 2, originX: 1 }),
        makeFeature('b1', 'boolean_union', { bodyRefs: 'f1, f2' }, ['f1', 'f2']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      const bounds = result.results.get('b1')?.bounds;
      expect(bounds).toBeDefined();
      // Union bounds should encompass both boxes: minX=-1, maxX=2
      expect(bounds!.minX).toBe(-1);
      expect(bounds!.maxX).toBe(2);
    });

    it('should evaluate boolean_subtract with valid refs', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 4, height: 4, depth: 4 }),
        makeFeature('f2', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('b1', 'boolean_subtract', { targetRef: 'f1', toolRef: 'f2' }, ['f1', 'f2']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      // Subtract bounds are the target bounds
      const bounds = result.results.get('b1')?.bounds;
      expect(bounds).toEqual({
        minX: -2,
        minY: -2,
        minZ: -2,
        maxX: 2,
        maxY: 2,
        maxZ: 2,
      });
    });

    it('should evaluate boolean_intersect with valid refs', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 4, height: 4, depth: 4 }),
        makeFeature('f2', 'extrude', { width: 4, height: 4, depth: 4, originX: 2 }),
        makeFeature('b1', 'boolean_intersect', { bodyRefs: 'f1, f2' }, ['f1', 'f2']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      // Intersect bounds should be the overlap region
      const bounds = result.results.get('b1')?.bounds;
      expect(bounds).toBeDefined();
      expect(bounds!.minX).toBe(0); // overlap starts at 0
      expect(bounds!.maxX).toBe(2); // overlap ends at 2
    });

    it('should validate mirror with missing required featureRef', () => {
      const features = [makeFeature('f1', 'mirror', { featureRef: '', plane: 'yz' })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Missing required parameter');
    });

    it('should evaluate mirror with valid featureRef', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 2, height: 2, depth: 2 }),
        makeFeature('m1', 'mirror', { featureRef: 'f1', plane: 'yz' }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      const bounds = result.results.get('m1')?.bounds;
      expect(bounds).toBeDefined();
    });

    // --- Shell ---

    it('should validate shell requires targetRef', () => {
      const features = [makeFeature('f1', 'shell', { thickness: 1 })];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Missing required parameter');
    });

    it('should evaluate shell with valid targetRef', () => {
      const features = [
        makeFeature('f1', 'extrude', { width: 4, height: 3, depth: 2, originX: 1 }),
        makeFeature('s1', 'shell', { targetRef: 'f1', thickness: 0.5 }, ['f1']),
      ];
      const result = engine.rebuildAll(features);
      expect(result.errors).toEqual([]);
      const bounds = result.results.get('s1')?.bounds;
      expect(bounds).toBeDefined();
      // Shell bounds should match the target body's bounds
      const targetBounds = result.results.get('f1')?.bounds;
      expect(bounds!.minX).toBeCloseTo(targetBounds!.minX);
      expect(bounds!.maxX).toBeCloseTo(targetBounds!.maxX);
    });

    it('should fail shell when targetRef dependency is missing', () => {
      const features = [makeFeature('s1', 'shell', { targetRef: 'nonexistent', thickness: 1 }, ['nonexistent'])];
      const result = engine.rebuildAll(features);
      expect(result.errors[0]).toContain('Missing dependency');
    });
  });
});
