import { describe, it, expect } from 'vitest';
import {
  measureDistanceBetween,
  measureAngleBetween,
  computeMeshBounds,
  computeMeshCentroid,
  computeMeshSurfaceArea,
  computeMeshVolume,
} from './measure-api';
import type { Point3D, MeshData } from '../types/cad';

function makeBoxMesh(): MeshData {
  return {
    vertices: new Float32Array([
      0,0,0, 1,0,0, 1,1,0, 0,1,0,
      0,0,1, 1,0,1, 1,1,1, 0,1,1,
    ]),
    normals: new Float32Array([
      0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
    ]),
    indices: new Uint32Array([
      0,1,2, 0,2,3, 4,7,6, 4,6,5,
    ]),
    featureId: 'test',
  };
}

describe('measure-api', () => {
  describe('measureDistanceBetween', () => {
    it('should compute distance between two points', () => {
      const a: Point3D = { x: 0, y: 0, z: 0 };
      const b: Point3D = { x: 3, y: 4, z: 0 };
      const result = measureDistanceBetween(a, b);
      expect(result.distance).toBe(5);
      expect(result.pointA).toBe(a);
      expect(result.pointB).toBe(b);
    });

    it('should return 0 for identical points', () => {
      const p: Point3D = { x: 1, y: 2, z: 3 };
      const result = measureDistanceBetween(p, p);
      expect(result.distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const a: Point3D = { x: -1, y: -1, z: -1 };
      const b: Point3D = { x: 1, y: 1, z: 1 };
      const result = measureDistanceBetween(a, b);
      expect(result.distance).toBeCloseTo(Math.sqrt(12), 5);
    });
  });

  describe('measureAngleBetween', () => {
    it('should return 0 for parallel vectors', () => {
      const a: Point3D = { x: 1, y: 0, z: 0 };
      const b: Point3D = { x: 2, y: 0, z: 0 };
      const angle = measureAngleBetween(a, b);
      // angleBetween returns degrees
      expect(angle).toBeCloseTo(0, 5);
    });

    it('should return 180 for opposite vectors', () => {
      const a: Point3D = { x: 1, y: 0, z: 0 };
      const b: Point3D = { x: -1, y: 0, z: 0 };
      const angle = measureAngleBetween(a, b);
      expect(angle).toBeCloseTo(180, 5);
    });

    it('should return 90 for perpendicular vectors', () => {
      const a: Point3D = { x: 1, y: 0, z: 0 };
      const b: Point3D = { x: 0, y: 1, z: 0 };
      const angle = measureAngleBetween(a, b);
      expect(angle).toBeCloseTo(90, 5);
    });
  });

  describe('computeMeshBounds', () => {
    it('should compute bounding box for a mesh', () => {
      const mesh = makeBoxMesh();
      const bounds = computeMeshBounds(mesh);
      expect(bounds).toBeDefined();
      expect(bounds.bounds.minX).toBe(0);
      expect(bounds.bounds.maxX).toBe(1);
    });
  });

  describe('computeMeshCentroid', () => {
    it('should compute centroid for a mesh', () => {
      const mesh = makeBoxMesh();
      const centroid = computeMeshCentroid(mesh);
      expect(centroid).toBeDefined();
      expect(typeof centroid.x).toBe('number');
      expect(typeof centroid.y).toBe('number');
      expect(typeof centroid.z).toBe('number');
    });
  });

  describe('computeMeshSurfaceArea', () => {
    it('should return a positive number for surface area', () => {
      const mesh = makeBoxMesh();
      const area = computeMeshSurfaceArea(mesh);
      expect(area).toBeGreaterThan(0);
    });
  });

  describe('computeMeshVolume', () => {
    it('should return a number for volume', () => {
      const mesh = makeBoxMesh();
      const vol = computeMeshVolume(mesh);
      expect(typeof vol).toBe('number');
    });
  });
});
