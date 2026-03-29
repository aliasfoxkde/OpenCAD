import { describe, it, expect } from 'vitest';
import {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateConeMesh,
  generateTorusMesh,
} from './mesh-generators';

/** Validate mesh integrity: index bounds, normal lengths, vertex count consistency */
function validateMesh(mesh: { vertices: Float32Array; normals: Float32Array; indices: Uint32Array }, label: string) {
  const vCount = mesh.vertices.length / 3;
  const nCount = mesh.normals.length / 3;

  // Vertex and normal arrays must be same length (3 components each)
  expect(mesh.vertices.length, `${label}: vertex array should be 3*n`).toBe(vCount * 3);
  expect(mesh.normals.length, `${label}: normal array length matches vertices`).toBe(vCount * 3);

  // All indices must be < vertex count
  for (let i = 0; i < mesh.indices.length; i++) {
    expect(mesh.indices[i]!, `${label}: index ${i} out of bounds`).toBeLessThan(vCount);
  }

  // Index count must be divisible by 3 (triangles)
  expect(mesh.indices.length % 3, `${label}: indices must form triangles`).toBe(0);

  // Normals should be unit length
  for (let i = 0; i < nCount; i++) {
    const nx = mesh.normals[i * 3]!;
    const ny = mesh.normals[i * 3 + 1]!;
    const nz = mesh.normals[i * 3 + 2]!;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-6) {
      expect(len).toBeCloseTo(1, 1);
    }
  }

  return { vertexCount: vCount, triangleCount: mesh.indices.length / 3 };
}

/** Compute axis-aligned bounding box of vertices */
function computeBounds(vertices: Float32Array) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!, y = vertices[i + 1]!, z = vertices[i + 2]!;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

describe('MeshGenerators', () => {
  describe('generateBoxMesh', () => {
    it('should produce a valid 1x1x1 box', () => {
      const mesh = generateBoxMesh(1, 1, 1);
      const { vertexCount, triangleCount } = validateMesh(mesh, 'box');

      expect(vertexCount).toBe(8);
      expect(triangleCount).toBe(12); // 6 faces × 2 triangles
    });

    it('should respect width, height, depth dimensions', () => {
      const mesh = generateBoxMesh(4, 6, 8);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.maxX - bounds.minX).toBeCloseTo(4, 5);
      expect(bounds.maxY - bounds.minY).toBeCloseTo(6, 5);
      expect(bounds.maxZ - bounds.minZ).toBeCloseTo(8, 5);
    });

    it('should be centered at origin', () => {
      const mesh = generateBoxMesh(2, 2, 2);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.minX).toBeCloseTo(-1, 5);
      expect(bounds.maxX).toBeCloseTo(1, 5);
      expect(bounds.minY).toBeCloseTo(-1, 5);
      expect(bounds.maxY).toBeCloseTo(1, 5);
    });

    it('should handle zero-size dimensions', () => {
      const mesh = generateBoxMesh(0, 0, 0);
      validateMesh(mesh, 'zero-box');
      const bounds = computeBounds(mesh.vertices);
      expect(bounds.minX).toBeCloseTo(0);
      expect(bounds.maxX).toBeCloseTo(0);
    });
  });

  describe('generateCylinderMesh', () => {
    it('should produce a valid cylinder', () => {
      const mesh = generateCylinderMesh(1, 2);
      const { vertexCount, triangleCount } = validateMesh(mesh, 'cylinder');

      expect(vertexCount).toBe(66); // 2 center + 32 bottom ring + 32 top ring
      expect(triangleCount).toBe(128); // 32 bottom + 32 top + 64 sides
    });

    it('should respect radius and height', () => {
      const mesh = generateCylinderMesh(3, 10);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.maxX - bounds.minX).toBeCloseTo(6, 1);
      expect(bounds.maxY - bounds.minY).toBeCloseTo(10, 1);
    });

    it('should be centered vertically', () => {
      const mesh = generateCylinderMesh(1, 4);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.minY).toBeCloseTo(-2, 5);
      expect(bounds.maxY).toBeCloseTo(2, 5);
    });
  });

  describe('generateSphereMesh', () => {
    it('should produce a valid sphere', () => {
      const mesh = generateSphereMesh(1);
      const { triangleCount } = validateMesh(mesh, 'sphere');

      // 32 width segments × 16 height segments × 2 triangles = 1024
      expect(triangleCount).toBe(1024);
    });

    it('should have correct radius', () => {
      const mesh = generateSphereMesh(5);

      for (let i = 0; i < mesh.vertices.length; i += 3) {
        const x = mesh.vertices[i]!;
        const y = mesh.vertices[i + 1]!;
        const z = mesh.vertices[i + 2]!;
        const r = Math.sqrt(x * x + y * y + z * z);
        expect(r).toBeCloseTo(5, 2);
      }
    });

    it('should have poles at top and bottom', () => {
      const mesh = generateSphereMesh(1);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.maxY).toBeCloseTo(1, 2);
      expect(bounds.minY).toBeCloseTo(-1, 2);
    });
  });

  describe('generateConeMesh', () => {
    it('should produce a valid cone', () => {
      const mesh = generateConeMesh(1, 2);
      const { triangleCount } = validateMesh(mesh, 'cone');

      expect(triangleCount).toBe(64); // 32 bottom cap + 32 sides
    });

    it('should have apex at top', () => {
      const mesh = generateConeMesh(2, 6);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.maxY).toBeCloseTo(3, 2); // half height
      expect(bounds.minY).toBeCloseTo(-3, 2);
    });

    it('should have correct base radius', () => {
      const mesh = generateConeMesh(5, 10);
      // Check bottom ring vertices (skip center at 0 and apex at 1)
      for (let i = 2; i < 2 + 33; i++) {
        const x = mesh.vertices[i * 3]!;
        const z = mesh.vertices[i * 3 + 2]!;
        if (i < 34) { // bottom ring vertices
          const r = Math.sqrt(x * x + z * z);
          expect(r).toBeCloseTo(5, 2);
        }
      }
    });
  });

  describe('generateTorusMesh', () => {
    it('should produce a valid torus', () => {
      const mesh = generateTorusMesh(1, 0.3);
      const { triangleCount } = validateMesh(mesh, 'torus');

      // 48 radial × 16 tubular × 2 = 1536
      expect(triangleCount).toBe(1536);
    });

    it('should have correct outer bounds', () => {
      const mesh = generateTorusMesh(2, 0.5);
      const bounds = computeBounds(mesh.vertices);

      // Outer extent: radius + tube = 2.5
      expect(bounds.maxX).toBeCloseTo(2.5, 1);
      expect(bounds.minX).toBeCloseTo(-2.5, 1);
      // Vertical extent: just the tube = 0.5
      expect(bounds.maxY).toBeCloseTo(0.5, 1);
      expect(bounds.minY).toBeCloseTo(-0.5, 1);
    });

    it('should have vertices near the inner ring', () => {
      const mesh = generateTorusMesh(3, 1);

      // Inner ring: radius - tube = 2, at v=0 (top of tube)
      let foundInner = false;
      for (let i = 0; i < mesh.vertices.length; i += 3) {
        const x = mesh.vertices[i]!;
        const y = mesh.vertices[i + 1]!;
        const z = mesh.vertices[i + 2]!;
        const r = Math.sqrt(x * x + z * z);
        if (Math.abs(r - 2) < 0.01 && Math.abs(y) < 0.01) {
          foundInner = true;
          break;
        }
      }
      expect(foundInner).toBe(true);
    });
  });

  describe('Cross-cutting validations', () => {
    const generators = [
      { name: 'box', fn: () => generateBoxMesh(1, 1, 1) },
      { name: 'cylinder', fn: () => generateCylinderMesh(1, 1) },
      { name: 'sphere', fn: () => generateSphereMesh(1) },
      { name: 'cone', fn: () => generateConeMesh(1, 1) },
      { name: 'torus', fn: () => generateTorusMesh(1, 0.3) },
    ];

    for (const gen of generators) {
      describe(gen.name, () => {
        it('should have non-zero indices', () => {
          const mesh = gen.fn();
          expect(mesh.indices.length).toBeGreaterThan(0);
          expect(mesh.vertices.length).toBeGreaterThan(0);
          expect(mesh.normals.length).toBeGreaterThan(0);
        });

        it('should produce no NaN vertices', () => {
          const mesh = gen.fn();
          for (let i = 0; i < mesh.vertices.length; i++) {
            expect(Number.isNaN(mesh.vertices[i])).toBe(false);
          }
        });

        it('should produce no NaN normals', () => {
          const mesh = gen.fn();
          for (let i = 0; i < mesh.normals.length; i++) {
            expect(Number.isNaN(mesh.normals[i])).toBe(false);
          }
        });

        it('should have no duplicate indices in the same triangle', () => {
          const mesh = gen.fn();
          for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i]!;
            const b = mesh.indices[i + 1]!;
            const c = mesh.indices[i + 2]!;
            expect(a).not.toBe(b);
            expect(b).not.toBe(c);
            expect(a).not.toBe(c);
          }
        });
      });
    }
  });
});
