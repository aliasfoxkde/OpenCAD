import { describe, it, expect } from 'vitest';
import { featureToMesh, featuresToMeshes } from './feature-to-mesh';
import type { FeatureNode } from '../types/cad';

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

describe('feature-to-mesh', () => {
  it('should convert extrude feature to mesh', () => {
    const mesh = featureToMesh(makeFeature());
    expect(mesh).not.toBeNull();
    expect(mesh!.vertices.length).toBeGreaterThan(0);
    expect(mesh!.indices.length).toBeGreaterThan(0);
  });

  it('should convert sphere feature to mesh', () => {
    const mesh = featureToMesh(makeFeature({ type: 'sphere', parameters: { radius: 3 } }));
    expect(mesh).not.toBeNull();
  });

  it('should return null for unknown feature type', () => {
    const mesh = featureToMesh(makeFeature({ type: 'sketch' }));
    expect(mesh).toBeNull();
  });

  it('should convert hole feature to mesh', () => {
    const mesh = featureToMesh(makeFeature({
      type: 'hole',
      parameters: { diameter: 6, depth: 10 },
    }));
    expect(mesh).not.toBeNull();
    expect(mesh!.vertices.length).toBeGreaterThan(0);
    expect(mesh!.indices.length).toBeGreaterThan(0);
  });

  it('should assign featureId to hole mesh', () => {
    const mesh = featureToMesh(makeFeature({
      id: 'hole-42',
      type: 'hole',
      parameters: { diameter: 4, depth: 8 },
    }));
    expect(mesh!.featureId).toBe('hole-42');
  });

  it('should skip suppressed features', () => {
    const features = [
      makeFeature({ id: 'a' }),
      makeFeature({ id: 'b', suppressed: true }),
      makeFeature({ id: 'c' }),
    ];
    const meshes = featuresToMeshes(features);
    expect(meshes).toHaveLength(2);
    expect(meshes[0]!.featureId).toBe('a');
    expect(meshes[1]!.featureId).toBe('c');
  });

  it('should handle empty features array', () => {
    expect(featuresToMeshes([])).toEqual([]);
  });

  describe('pattern_linear', () => {
    it('should return null when no allFeatures provided', () => {
      const mesh = featureToMesh(makeFeature({
        id: 'p1',
        type: 'pattern_linear',
        parameters: { featureRef: 'box1', count: 3, spacing: 5, direction: 'x' },
      }));
      expect(mesh).toBeNull();
    });

    it('should return null when referenced feature not found', () => {
      const mesh = featureToMesh(
        makeFeature({
          id: 'p1',
          type: 'pattern_linear',
          parameters: { featureRef: 'missing', count: 3, spacing: 5, direction: 'x' },
        }),
        [],
      );
      expect(mesh).toBeNull();
    });

    it('should produce mesh with N times vertices for linear pattern', () => {
      const refBox = makeFeature({ id: 'box1' });
      const baseMesh = featureToMesh(refBox);
      const baseVertexCount = baseMesh!.vertices.length / 3;

      const mesh = featureToMesh(
        makeFeature({
          id: 'p1',
          type: 'pattern_linear',
          parameters: { featureRef: 'box1', count: 3, spacing: 5, direction: 'x' },
        }),
        [refBox],
      );

      expect(mesh).not.toBeNull();
      expect(mesh!.vertices.length).toBe(baseVertexCount * 3 * 3);
      expect(mesh!.featureId).toBe('p1');
    });

    it('should offset vertices along x direction', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 2, height: 2, depth: 2 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 'p1',
          type: 'pattern_linear',
          parameters: { featureRef: 'box1', count: 2, spacing: 5, direction: 'x' },
        }),
        [refBox],
      );

      expect(mesh).not.toBeNull();
      // First instance: vertices unchanged (offset 0)
      // Second instance: all x values shifted by 5
      const v = mesh!.vertices;
      const baseVertexCount = v.length / 6; // 2 instances
      // Check that second instance has different x values
      const firstX = v[0]!;
      const secondX = v[baseVertexCount * 3]!;
      expect(Math.abs(secondX - firstX - 5)).toBeLessThan(0.01);
    });
  });

  describe('pattern_circular', () => {
    it('should produce mesh with N times vertices for circular pattern', () => {
      const refBox = makeFeature({ id: 'box1' });
      const baseMesh = featureToMesh(refBox);
      const baseVertexCount = baseMesh!.vertices.length / 3;

      const mesh = featureToMesh(
        makeFeature({
          id: 'cp1',
          type: 'pattern_circular',
          parameters: { featureRef: 'box1', count: 4, angle: 360, axis: 'z' },
        }),
        [refBox],
      );

      expect(mesh).not.toBeNull();
      expect(mesh!.vertices.length).toBe(baseVertexCount * 4 * 3);
      expect(mesh!.featureId).toBe('cp1');
    });

    it('should rotate vertices for circular pattern', () => {
      const refCyl = makeFeature({
        id: 'cyl1',
        type: 'revolve',
        parameters: { radius: 0.5, height: 2 },
      });

      const mesh = featureToMesh(
        makeFeature({
          id: 'cp1',
          type: 'pattern_circular',
          parameters: { featureRef: 'cyl1', count: 2, angle: 360, axis: 'z' },
        }),
        [refCyl],
      );

      expect(mesh).not.toBeNull();
      // With 2 instances at 180 degrees apart, positions should be mirrored
      const v = mesh!.vertices;
      const halfLen = v.length / 2;
      // First vertex of instance 1 and instance 2 should be 180 degrees apart
      const x0 = v[0]!;
      const y0 = v[1]!;
      const x1 = v[halfLen]!;
      const y1 = v[halfLen + 1]!;
      // They should be mirrored around origin (180 degree rotation around z)
      expect(Math.abs(x0 + x1)).toBeLessThan(0.01);
      expect(Math.abs(y0 + y1)).toBeLessThan(0.01);
    });

    it('should return null when referenced feature is suppressed', () => {
      // featureToMesh itself does not check suppressed — featuresToMeshes does
      // But pattern code does check suppressed on the ref feature
      const refBox = makeFeature({ id: 'box1', suppressed: true });
      const mesh = featureToMesh(
        makeFeature({
          id: 'p1',
          type: 'pattern_linear',
          parameters: { featureRef: 'box1', count: 2, spacing: 5, direction: 'x' },
        }),
        [refBox],
      );
      // Pattern mesh generation skips suppressed references
      expect(mesh).toBeNull();
    });
  });

  describe('boolean_union', () => {
    it('should return null when no allFeatures provided', () => {
      const mesh = featureToMesh(makeFeature({
        id: 'b1',
        type: 'boolean_union',
        parameters: { bodyRefs: 'box1, box2' },
      }));
      expect(mesh).toBeNull();
    });

    it('should return null when fewer than 2 bodies', () => {
      const box = makeFeature({ id: 'box1' });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_union',
          parameters: { bodyRefs: 'box1' },
        }),
        [box],
      );
      expect(mesh).toBeNull();
    });

    it('should produce mesh for union of two overlapping boxes', () => {
      const box1 = makeFeature({ id: 'box1', parameters: { width: 2, height: 2, depth: 2, originX: -0.5 } });
      const box2 = makeFeature({ id: 'box2', parameters: { width: 2, height: 2, depth: 2, originX: 0.5 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_union',
          parameters: { bodyRefs: 'box1, box2' },
        }),
        [box1, box2],
      );
      expect(mesh).not.toBeNull();
      expect(mesh!.featureId).toBe('b1');
      expect(mesh!.vertices.length).toBeGreaterThan(0);
    });

    it('should return null when referenced feature is suppressed', () => {
      const box1 = makeFeature({ id: 'box1', suppressed: true });
      const box2 = makeFeature({ id: 'box2' });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_union',
          parameters: { bodyRefs: 'box1, box2' },
        }),
        [box1, box2],
      );
      expect(mesh).toBeNull();
    });
  });

  describe('boolean_subtract', () => {
    it('should return null when no allFeatures provided', () => {
      const mesh = featureToMesh(makeFeature({
        id: 'b1',
        type: 'boolean_subtract',
        parameters: { targetRef: 'box1', toolRef: 'box2' },
      }));
      expect(mesh).toBeNull();
    });

    it('should return null when target or tool missing', () => {
      const box1 = makeFeature({ id: 'box1' });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_subtract',
          parameters: { targetRef: 'box1', toolRef: 'missing' },
        }),
        [box1],
      );
      expect(mesh).toBeNull();
    });

    it('should produce mesh for subtract of two boxes', () => {
      const box1 = makeFeature({ id: 'box1', parameters: { width: 4, height: 4, depth: 4 } });
      const box2 = makeFeature({ id: 'box2', parameters: { width: 2, height: 2, depth: 2, originX: 0, originY: 0, originZ: 0 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_subtract',
          parameters: { targetRef: 'box1', toolRef: 'box2' },
        }),
        [box1, box2],
      );
      expect(mesh).not.toBeNull();
      expect(mesh!.featureId).toBe('b1');
      expect(mesh!.vertices.length).toBeGreaterThan(0);
    });

    it('should return null when target suppressed', () => {
      const box1 = makeFeature({ id: 'box1', suppressed: true });
      const box2 = makeFeature({ id: 'box2' });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_subtract',
          parameters: { targetRef: 'box1', toolRef: 'box2' },
        }),
        [box1, box2],
      );
      expect(mesh).toBeNull();
    });
  });

  describe('boolean_intersect', () => {
    it('should return null when fewer than 2 bodies', () => {
      const box1 = makeFeature({ id: 'box1' });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_intersect',
          parameters: { bodyRefs: 'box1' },
        }),
        [box1],
      );
      expect(mesh).toBeNull();
    });

    it('should produce mesh for intersect of two overlapping boxes', () => {
      const box1 = makeFeature({ id: 'box1', parameters: { width: 4, height: 4, depth: 4, originX: -0.5 } });
      const box2 = makeFeature({ id: 'box2', parameters: { width: 4, height: 4, depth: 4, originX: 0.5 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 'b1',
          type: 'boolean_intersect',
          parameters: { bodyRefs: 'box1, box2' },
        }),
        [box1, box2],
      );
      expect(mesh).not.toBeNull();
      expect(mesh!.featureId).toBe('b1');
      expect(mesh!.vertices.length).toBeGreaterThan(0);
    });
  });

  describe('mirror', () => {
    it('should return null when no allFeatures provided', () => {
      const mesh = featureToMesh(makeFeature({
        id: 'm1',
        type: 'mirror',
        parameters: { featureRef: 'box1', plane: 'yz' },
      }));
      expect(mesh).toBeNull();
    });

    it('should return null when referenced feature not found', () => {
      const mesh = featureToMesh(
        makeFeature({
          id: 'm1',
          type: 'mirror',
          parameters: { featureRef: 'missing', plane: 'yz' },
        }),
        [],
      );
      expect(mesh).toBeNull();
    });

    it('should mirror vertices across YZ plane (negate X)', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 2, height: 2, depth: 2, originX: 3 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 'm1',
          type: 'mirror',
          parameters: { featureRef: 'box1', plane: 'yz' },
        }),
        [refBox],
      );

      expect(mesh).not.toBeNull();
      expect(mesh!.featureId).toBe('m1');
      // Mirror across YZ negates X — check that mirrored vertices have flipped X
      const v = mesh!.vertices;
      const baseV = featureToMesh(refBox)!.vertices;
      expect(v.length).toBe(baseV.length);
      // First vertex x should be negated
      expect(Math.abs(v[0]! + baseV[0]!)).toBeLessThan(0.01);
    });

    it('should mirror vertices across XZ plane (negate Y)', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 2, height: 2, depth: 2, originY: 4 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 'm1',
          type: 'mirror',
          parameters: { featureRef: 'box1', plane: 'xz' },
        }),
        [refBox],
      );

      expect(mesh).not.toBeNull();
      const v = mesh!.vertices;
      const baseV = featureToMesh(refBox)!.vertices;
      // First vertex y should be negated
      expect(Math.abs(v[1]! + baseV[1]!)).toBeLessThan(0.01);
    });

    it('should mirror vertices across XY plane (negate Z)', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 2, height: 2, depth: 2, originZ: 5 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 'm1',
          type: 'mirror',
          parameters: { featureRef: 'box1', plane: 'xy' },
        }),
        [refBox],
      );

      expect(mesh).not.toBeNull();
      const v = mesh!.vertices;
      const baseV = featureToMesh(refBox)!.vertices;
      // First vertex z should be negated
      expect(Math.abs(v[2]! + baseV[2]!)).toBeLessThan(0.01);
    });

    it('should return null when referenced feature is suppressed', () => {
      const refBox = makeFeature({ id: 'box1', suppressed: true });
      const mesh = featureToMesh(
        makeFeature({
          id: 'm1',
          type: 'mirror',
          parameters: { featureRef: 'box1', plane: 'yz' },
        }),
        [refBox],
      );
      expect(mesh).toBeNull();
    });
  });

  describe('shell', () => {
    it('should return null without allFeatures', () => {
      const mesh = featureToMesh(makeFeature({
        id: 's1',
        type: 'shell',
        parameters: { targetRef: 'box1', thickness: 0.5 },
      }));
      expect(mesh).toBeNull();
    });

    it('should return null when targetRef is empty', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 4, height: 4, depth: 4 } });
      const mesh = featureToMesh(
        makeFeature({ id: 's1', type: 'shell', parameters: { targetRef: '', thickness: 0.5 } }),
        [refBox],
      );
      expect(mesh).toBeNull();
    });

    it('should return null when target feature is suppressed', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 4, height: 4, depth: 4 }, suppressed: true });
      const mesh = featureToMesh(
        makeFeature({ id: 's1', type: 'shell', parameters: { targetRef: 'box1', thickness: 0.5 } }),
        [refBox],
      );
      expect(mesh).toBeNull();
    });

    it('should produce a mesh for a shell on a box', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 4, height: 4, depth: 4 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 's1',
          type: 'shell',
          parameters: { targetRef: 'box1', thickness: 0.5 },
        }),
        [refBox],
      );
      expect(mesh).not.toBeNull();
      expect(mesh!.vertices.length).toBeGreaterThan(0);
      expect(mesh!.indices.length).toBeGreaterThan(0);
      expect(mesh!.featureId).toBe('s1');
    });

    it('should produce a mesh for a shell on a positioned box', () => {
      const refBox = makeFeature({ id: 'box1', parameters: { width: 4, height: 4, depth: 4, originX: 3, originY: 2 } });
      const mesh = featureToMesh(
        makeFeature({
          id: 's1',
          type: 'shell',
          parameters: { targetRef: 'box1', thickness: 0.5 },
        }),
        [refBox],
      );
      expect(mesh).not.toBeNull();
      expect(mesh!.featureId).toBe('s1');
    });
  });
});
