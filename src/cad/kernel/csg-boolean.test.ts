import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { booleanTwo, booleanUnion, booleanSubtract, booleanIntersect } from './csg-boolean';

/** Create a unit box centered at origin */
function makeBox(size = 2, pos: [number, number, number] = [0, 0, 0]): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(size, size, size);
  geo.translate(pos[0], pos[1], pos[2]);
  return geo;
}

/** Create a sphere */
function makeSphere(radius: number, pos: [number, number, number] = [0, 0, 0]): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, 16, 16);
  geo.translate(pos[0], pos[1], pos[2]);
  return geo;
}

/** Count non-degenerate triangles in geometry */
function triangleCount(geo: THREE.BufferGeometry): number {
  const index = geo.getIndex();
  if (index) return index.count / 3;
  const pos = geo.getAttribute('position');
  return pos.count / 3;
}

describe('csg-boolean', () => {
  describe('booleanTwo', () => {
    it('should union two overlapping boxes', () => {
      const a = makeBox(2, [-0.5, 0, 0]);
      const b = makeBox(2, [0.5, 0, 0]);
      const result = booleanTwo(a, b, 'union');
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBeGreaterThan(0);
    });

    it('should subtract a box from another', () => {
      const a = makeBox(2, [0, 0, 0]);
      const b = makeBox(1, [0.5, 0, 0]);
      const result = booleanTwo(a, b, 'subtract');
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBeGreaterThan(0);
    });

    it('should intersect two overlapping boxes', () => {
      const a = makeBox(2, [-0.5, 0, 0]);
      const b = makeBox(2, [0.5, 0, 0]);
      const result = booleanTwo(a, b, 'intersect');
      expect(result).not.toBeNull();
      // Intersection of two overlapping unit boxes should have fewer vertices than union
      expect(result!.getAttribute('position').count).toBeGreaterThan(0);
    });

    it('should return a result with position attribute', () => {
      const a = makeBox();
      const b = makeSphere(1);
      const result = booleanTwo(a, b, 'union');
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position')).toBeDefined();
    });
  });

  describe('booleanUnion', () => {
    it('should return null for empty array', () => {
      expect(booleanUnion([])).toBeNull();
    });

    it('should return clone for single geometry', () => {
      const geo = makeBox();
      const result = booleanUnion([geo]);
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBe(geo.getAttribute('position').count);
    });

    it('should union three overlapping boxes', () => {
      const a = makeBox(2, [0, 0, 0]);
      const b = makeBox(2, [1, 0, 0]);
      const c = makeBox(2, [0, 1, 0]);
      const result = booleanUnion([a, b, c]);
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBeGreaterThan(0);
    });
  });

  describe('booleanSubtract', () => {
    it('should return clone when no tools', () => {
      const geo = makeBox();
      const result = booleanSubtract(geo, []);
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBe(geo.getAttribute('position').count);
    });

    it('should subtract a sphere from a box', () => {
      const box = makeBox(3);
      const sphere = makeSphere(1.2);
      const result = booleanSubtract(box, [sphere]);
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBeGreaterThan(0);
    });

    it('should subtract multiple tools from target', () => {
      const box = makeBox(4);
      const tool1 = makeBox(1, [1, 0, 0]);
      const tool2 = makeBox(1, [-1, 0, 0]);
      const result = booleanSubtract(box, [tool1, tool2]);
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBeGreaterThan(0);
    });
  });

  describe('booleanIntersect', () => {
    it('should return null for single geometry', () => {
      expect(booleanIntersect([makeBox()])).toBeNull();
    });

    it('should return null for empty array', () => {
      expect(booleanIntersect([])).toBeNull();
    });

    it('should intersect a box and sphere', () => {
      const box = makeBox(2);
      const sphere = makeSphere(1);
      const result = booleanIntersect([box, sphere]);
      expect(result).not.toBeNull();
      expect(result!.getAttribute('position').count).toBeGreaterThan(0);
    });
  });
});
