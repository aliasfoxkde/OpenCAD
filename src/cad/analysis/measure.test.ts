import { describe, it, expect } from 'vitest';
import {
  distance3D,
  angleBetween,
  angleBetweenLines,
  computeBounds,
  computeCentroid,
  computeSurfaceArea,
  computeVolume,
  measureBoundingBox,
  getMassProperties,
  measureDistance,
  measureAngle,
  type Point3D,
} from './measure';

function createTriangleMesh(): import('../../types/cad').MeshData {
  // Right triangle in XY plane: (0,0,0), (1,0,0), (0,1,0)
  return {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    featureId: 'test',
  };
}

function createUnitCubeMesh(): import('../../types/cad').MeshData {
  // Unit cube centered at origin
  const hw = 0.5;
  const vertices = new Float32Array([
    -hw, -hw, -hw, hw, -hw, -hw, hw, hw, -hw, -hw, hw, -hw,
    -hw, -hw, hw, hw, -hw, hw, hw, hw, hw, -hw, hw, hw,
  ]);
  const normals = new Float32Array([
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
  ]);
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    2, 3, 7, 2, 7, 6,
    0, 4, 7, 0, 7, 3,
    1, 2, 6, 1, 6, 5,
  ]);
  return { vertices, normals, indices, featureId: 'cube' };
}

describe('Measure Tools', () => {
  describe('distance3D', () => {
    it('should compute distance between two points', () => {
      expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBeCloseTo(1, 5);
      expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(0);
    });

    it('should compute 3D distance correctly', () => {
      expect(distance3D({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 })).toBeCloseTo(5, 5);
    });

    it('should handle negative coordinates', () => {
      expect(distance3D({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 })).toBeCloseTo(
        Math.sqrt(12), 5,
      );
    });
  });

  describe('angleBetween', () => {
    it('should return 90 degrees for perpendicular vectors', () => {
      expect(angleBetween({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBeCloseTo(90, 2);
    });

    it('should return 0 degrees for parallel vectors', () => {
      expect(angleBetween({ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 })).toBeCloseTo(0, 2);
    });

    it('should return 180 degrees for opposite vectors', () => {
      expect(angleBetween({ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 })).toBeCloseTo(180, 2);
    });

    it('should return 0 for zero vectors', () => {
      expect(angleBetween({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(0);
    });

    it('should compute 45 degrees correctly', () => {
      expect(angleBetween({ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 })).toBeCloseTo(45, 2);
    });
  });

  describe('angleBetweenLines', () => {
    it('should compute angle between two lines', () => {
      const a1: Point3D = { x: 0, y: 0, z: 0 };
      const a2: Point3D = { x: 1, y: 0, z: 0 };
      const b1: Point3D = { x: 0, y: 0, z: 0 };
      const b2: Point3D = { x: 0, y: 1, z: 0 };

      expect(angleBetweenLines(a1, a2, b1, b2)).toBeCloseTo(90, 2);
    });
  });

  describe('computeBounds', () => {
    it('should compute correct bounding box for triangle', () => {
      const mesh = createTriangleMesh();
      const bounds = computeBounds(mesh);

      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(1);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(1);
      expect(bounds.minZ).toBe(0);
      expect(bounds.maxZ).toBe(0);
    });

    it('should compute correct bounding box for unit cube', () => {
      const mesh = createUnitCubeMesh();
      const bounds = computeBounds(mesh);

      expect(bounds.minX).toBeCloseTo(-0.5, 5);
      expect(bounds.maxX).toBeCloseTo(0.5, 5);
      expect(bounds.minY).toBeCloseTo(-0.5, 5);
      expect(bounds.maxY).toBeCloseTo(0.5, 5);
      expect(bounds.minZ).toBeCloseTo(-0.5, 5);
      expect(bounds.maxZ).toBeCloseTo(0.5, 5);
    });
  });

  describe('computeCentroid', () => {
    it('should compute centroid of triangle vertices', () => {
      const mesh = createTriangleMesh();
      const centroid = computeCentroid(mesh);

      expect(centroid.x).toBeCloseTo(1 / 3, 5);
      expect(centroid.y).toBeCloseTo(1 / 3, 5);
      expect(centroid.z).toBe(0);
    });

    it('should compute centroid of symmetric cube at origin', () => {
      const mesh = createUnitCubeMesh();
      const centroid = computeCentroid(mesh);

      expect(centroid.x).toBeCloseTo(0, 5);
      expect(centroid.y).toBeCloseTo(0, 5);
      expect(centroid.z).toBeCloseTo(0, 5);
    });
  });

  describe('computeSurfaceArea', () => {
    it('should compute area of a right triangle', () => {
      const mesh = createTriangleMesh();
      const area = computeSurfaceArea(mesh);
      expect(area).toBeCloseTo(0.5, 5);
    });

    it('should compute surface area of a unit cube', () => {
      const mesh = createUnitCubeMesh();
      const area = computeSurfaceArea(mesh);
      // 6 faces × 1 × 1 = 6
      expect(area).toBeCloseTo(6, 3);
    });
  });

  describe('computeVolume', () => {
    it('should compute volume of a unit cube', () => {
      const mesh = createUnitCubeMesh();
      const volume = computeVolume(mesh);
      expect(volume).toBeCloseTo(1, 2); // 1 × 1 × 1 = 1
    });

    it('should return zero for a flat triangle', () => {
      const mesh = createTriangleMesh();
      const volume = computeVolume(mesh);
      expect(volume).toBeCloseTo(0, 5);
    });
  });

  describe('measureBoundingBox', () => {
    it('should return dimensions for unit cube', () => {
      const mesh = createUnitCubeMesh();
      const result = measureBoundingBox(mesh);

      expect(result.width).toBeCloseTo(1, 5);
      expect(result.height).toBeCloseTo(1, 5);
      expect(result.depth).toBeCloseTo(1, 5);
    });

    it('should return dimensions for a 2x3x4 box', () => {
      // Create a 2x3x4 box mesh
      const w = 2, h = 3, d = 4;
      const hw = w / 2, hh = h / 2, hd = d / 2;
      const vertices = new Float32Array([
        -hw, -hh, -hd, hw, -hh, -hd, hw, hh, -hd, -hw, hh, -hd,
        -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
      ]);
      const mesh = {
        vertices,
        normals: new Float32Array(24),
        indices: new Uint32Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7]),
        featureId: '',
      };
      const result = measureBoundingBox(mesh);

      expect(result.width).toBeCloseTo(2, 5);
      expect(result.height).toBeCloseTo(3, 5);
      expect(result.depth).toBeCloseTo(4, 5);
    });
  });

  describe('measureDistance', () => {
    it('should return formatted distance result', () => {
      const result = measureDistance({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 });
      expect(result.value).toBeCloseTo(5, 5);
      expect(result.unit).toBe('mm');
      expect(result.label).toBe('Distance');
    });
  });

  describe('measureAngle', () => {
    it('should return formatted angle result', () => {
      const result = measureAngle(
        { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
      );
      expect(result.value).toBeCloseTo(90, 2);
      expect(result.unit).toBe('deg');
      expect(result.label).toBe('Angle');
    });
  });

  describe('getMassProperties', () => {
    it('should compute all mass properties for unit cube', () => {
      const mesh = createUnitCubeMesh();
      const props = getMassProperties(mesh);

      expect(props.centroid.x).toBeCloseTo(0, 5);
      expect(props.centroid.y).toBeCloseTo(0, 5);
      expect(props.centroid.z).toBeCloseTo(0, 5);

      expect(props.surfaceArea).toBeCloseTo(6, 3);
      expect(props.volume).toBeCloseTo(1, 2);

      expect(props.bounds.width).toBeCloseTo(1, 5);
      expect(props.bounds.height).toBeCloseTo(1, 5);
      expect(props.bounds.depth).toBeCloseTo(1, 5);
    });
  });
});
