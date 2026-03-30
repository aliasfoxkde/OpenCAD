import { describe, it, expect } from 'vitest';
import type { FeatureNode } from '../types/cad';
import {
  getRootFeatures,
  getDirectChildren,
  getDescendants,
  getAncestors,
  hasSuppressedAncestor,
  getAssemblyTransformMatrix,
  getEffectiveTransform,
  hasAssemblyTransform,
  getChildCount,
  DEG2RAD,
} from './assembly-tree';

function makeFeature(overrides: Partial<FeatureNode> & { id: string }): FeatureNode {
  return {
    type: 'extrude',
    name: 'Feature',
    parameters: {},
    dependencies: [],
    children: [],
    suppressed: false,
    ...overrides,
  };
}

describe('assembly-tree', () => {
  describe('getRootFeatures', () => {
    it('returns features with no parentId', () => {
      const features = [
        makeFeature({ id: 'a' }),
        makeFeature({ id: 'b', parentId: 'a' }),
        makeFeature({ id: 'c' }),
      ];
      const roots = getRootFeatures(features);
      expect(roots.map((f) => f.id)).toEqual(['a', 'c']);
    });

    it('returns all features when none have parentId', () => {
      const features = [
        makeFeature({ id: 'a' }),
        makeFeature({ id: 'b' }),
      ];
      expect(getRootFeatures(features)).toHaveLength(2);
    });
  });

  describe('getDirectChildren', () => {
    it('returns children of a parent', () => {
      const features = [
        makeFeature({ id: 'asm', type: 'assembly' }),
        makeFeature({ id: 'b', parentId: 'asm' }),
        makeFeature({ id: 'c', parentId: 'asm' }),
        makeFeature({ id: 'd' }),
      ];
      const children = getDirectChildren(features, 'asm');
      expect(children.map((f) => f.id)).toEqual(['b', 'c']);
    });

    it('returns root features when parentId is null', () => {
      const features = [
        makeFeature({ id: 'a' }),
        makeFeature({ id: 'b', parentId: 'a' }),
      ];
      const roots = getDirectChildren(features, null);
      expect(roots.map((f) => f.id)).toEqual(['a']);
    });
  });

  describe('getDescendants', () => {
    it('returns immediate children', () => {
      const features = [
        makeFeature({ id: 'asm', type: 'assembly' }),
        makeFeature({ id: 'b', parentId: 'asm' }),
        makeFeature({ id: 'c', parentId: 'asm' }),
      ];
      const desc = getDescendants(features, 'asm');
      expect(desc.map((f) => f.id)).toEqual(['b', 'c']);
    });

    it('returns nested descendants recursively', () => {
      const features = [
        makeFeature({ id: 'asm1', type: 'assembly' }),
        makeFeature({ id: 'asm2', type: 'assembly', parentId: 'asm1' }),
        makeFeature({ id: 'b', parentId: 'asm1' }),
        makeFeature({ id: 'c', parentId: 'asm2' }),
        makeFeature({ id: 'd' }),
      ];
      const desc = getDescendants(features, 'asm1');
      expect(desc.map((f) => f.id)).toEqual(['asm2', 'c', 'b']);
    });

    it('returns empty array for feature with no children', () => {
      const features = [makeFeature({ id: 'a' })];
      expect(getDescendants(features, 'a')).toEqual([]);
    });
  });

  describe('getAncestors', () => {
    it('returns parent chain from child to root', () => {
      const features = [
        makeFeature({ id: 'asm1', type: 'assembly' }),
        makeFeature({ id: 'asm2', type: 'assembly', parentId: 'asm1' }),
        makeFeature({ id: 'b', parentId: 'asm2' }),
      ];
      const ancestors = getAncestors(features, 'b');
      expect(ancestors.map((f) => f.id)).toEqual(['asm2', 'asm1']);
    });

    it('returns empty for root feature', () => {
      const features = [makeFeature({ id: 'a' })];
      expect(getAncestors(features, 'a')).toEqual([]);
    });
  });

  describe('hasSuppressedAncestor', () => {
    it('returns true when an ancestor assembly is suppressed', () => {
      const features = [
        makeFeature({ id: 'asm1', type: 'assembly', suppressed: true }),
        makeFeature({ id: 'b', parentId: 'asm1' }),
      ];
      expect(hasSuppressedAncestor(features, 'b')).toBe(true);
    });

    it('returns false when no ancestors are suppressed', () => {
      const features = [
        makeFeature({ id: 'asm1', type: 'assembly' }),
        makeFeature({ id: 'b', parentId: 'asm1' }),
      ];
      expect(hasSuppressedAncestor(features, 'b')).toBe(false);
    });

    it('returns false for root features', () => {
      expect(hasSuppressedAncestor([makeFeature({ id: 'a' })], 'a')).toBe(false);
    });
  });

  describe('getAssemblyTransformMatrix', () => {
    it('returns identity when all params are zero', () => {
      const asm = makeFeature({
        id: 'asm', type: 'assembly',
        parameters: { positionX: 0, positionY: 0, positionZ: 0, rotationX: 0, rotationY: 0, rotationZ: 0 },
      });
      const m = getAssemblyTransformMatrix(asm);
      // Use toBeCloseTo to handle -0 vs 0
      expect(m.length).toBe(12);
      expect(m[0]).toBeCloseTo(1);
      expect(m[5]).toBeCloseTo(1);
      expect(m[10]).toBeCloseTo(1);
      expect(m[3]).toBeCloseTo(0);
      expect(m[7]).toBeCloseTo(0);
      expect(m[11]).toBeCloseTo(0);
    });

    it('applies translation', () => {
      const asm = makeFeature({
        id: 'asm', type: 'assembly',
        parameters: { positionX: 5, positionY: 3, positionZ: 1 },
      });
      const m = getAssemblyTransformMatrix(asm);
      expect(m[3]).toBe(5);
      expect(m[7]).toBe(3);
      expect(m[11]).toBe(1);
      // Rotation part should be identity
      expect(m[0]).toBe(1);
      expect(m[5]).toBe(1);
      expect(m[10]).toBe(1);
    });

    it('applies 90-degree rotation around Z', () => {
      const asm = makeFeature({
        id: 'asm', type: 'assembly',
        parameters: { rotationZ: 90 },
      });
      const m = getAssemblyTransformMatrix(asm);
      // cos(90°) = 0, sin(90°) = 1
      expect(m[0]).toBeCloseTo(0);
      expect(m[1]).toBeCloseTo(-1);
      expect(m[4]).toBeCloseTo(1);
      expect(m[5]).toBeCloseTo(0);
    });
  });

  describe('getEffectiveTransform', () => {
    it('returns identity for root features', () => {
      const features = [makeFeature({ id: 'a' })];
      const t = getEffectiveTransform(features, 'a');
      expect(t).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
    });

    it('combines nested assembly transforms', () => {
      const features = [
        makeFeature({
          id: 'asm1', type: 'assembly',
          parameters: { positionX: 10 },
        }),
        makeFeature({
          id: 'asm2', type: 'assembly', parentId: 'asm1',
          parameters: { positionX: 5 },
        }),
        makeFeature({ id: 'b', parentId: 'asm2' }),
      ];
      const t = getEffectiveTransform(features, 'b');
      // Should have translation X = 10 + 5 = 15
      expect(t[3]).toBeCloseTo(15);
    });
  });

  describe('hasAssemblyTransform', () => {
    it('returns false for root features', () => {
      expect(hasAssemblyTransform([makeFeature({ id: 'a' })], 'a')).toBe(false);
    });

    it('returns true when parent has non-zero transform', () => {
      const features = [
        makeFeature({
          id: 'asm', type: 'assembly',
          parameters: { positionX: 5 },
        }),
        makeFeature({ id: 'b', parentId: 'asm' }),
      ];
      expect(hasAssemblyTransform(features, 'b')).toBe(true);
    });

    it('returns false when parent has identity transform', () => {
      const features = [
        makeFeature({
          id: 'asm', type: 'assembly',
          parameters: { positionX: 0, positionY: 0, positionZ: 0, rotationX: 0, rotationY: 0, rotationZ: 0 },
        }),
        makeFeature({ id: 'b', parentId: 'asm' }),
      ];
      expect(hasAssemblyTransform(features, 'b')).toBe(false);
    });
  });

  describe('getChildCount', () => {
    it('counts immediate children', () => {
      const features = [
        makeFeature({ id: 'asm', type: 'assembly' }),
        makeFeature({ id: 'b', parentId: 'asm' }),
        makeFeature({ id: 'c', parentId: 'asm' }),
        makeFeature({ id: 'd', parentId: 'b' }), // grandchild, not counted
      ];
      expect(getChildCount(features, 'asm')).toBe(2);
    });
  });

  describe('DEG2RAD', () => {
    it('converts 180 degrees to pi', () => {
      expect(DEG2RAD * 180).toBeCloseTo(Math.PI);
    });
  });
});
