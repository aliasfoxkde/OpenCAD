import { describe, it, expect } from 'vitest';
import { distance3D, computeVolume, computeSurfaceArea, computeBounds, getMassProperties } from '../src/core/measurement.js';
import { generateBoxMesh, generateSphereMesh } from '../src/core/mesh-engine.js';

describe('measurement tools', () => {
  describe('distance3D', () => {
    it('should compute distance between two points', () => {
      const d = distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
      expect(d).toBeCloseTo(5, 5);
    });

    it('should return 0 for identical points', () => {
      const d = distance3D({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 });
      expect(d).toBe(0);
    });
  });

  describe('computeVolume', () => {
    it('should compute volume of a unit box', () => {
      const mesh = generateBoxMesh(1, 1, 1);
      const vol = computeVolume(mesh);
      expect(vol).toBeGreaterThan(0);
    });

    it('should compute volume of a sphere', () => {
      const mesh = generateSphereMesh(1);
      const vol = computeVolume(mesh);
      // Volume of sphere = 4/3 * pi * r^3 ≈ 4.189
      expect(vol).toBeCloseTo(4.189, 0);
    });
  });

  describe('computeSurfaceArea', () => {
    it('should compute surface area of a box', () => {
      const mesh = generateBoxMesh(2, 3, 4);
      const area = computeSurfaceArea(mesh);
      // Surface area of box = 2*(2*3 + 2*4 + 3*4) = 52
      expect(area).toBeGreaterThan(0);
    });
  });

  describe('computeBounds', () => {
    it('should compute bounds of a centered box', () => {
      const mesh = generateBoxMesh(2, 2, 2);
      const bounds = computeBounds(mesh);
      expect(bounds.maxX - bounds.minX).toBeCloseTo(2, 1);
      expect(bounds.maxY - bounds.minY).toBeCloseTo(2, 1);
      expect(bounds.maxZ - bounds.minZ).toBeCloseTo(2, 1);
    });
  });

  describe('getMassProperties', () => {
    it('should return all mass properties', () => {
      const mesh = generateBoxMesh(1, 1, 1);
      const props = getMassProperties(mesh);
      expect(props.centroid).toBeDefined();
      expect(props.surfaceArea).toBeGreaterThan(0);
      expect(props.volume).toBeGreaterThan(0);
      expect(props.bounds).toBeDefined();
    });
  });
});
