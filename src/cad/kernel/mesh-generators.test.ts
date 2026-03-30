import { describe, it, expect } from 'vitest';
import {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateConeMesh,
  generateTorusMesh,
  generateHoleMesh,
  generateExtrudeProfileMesh,
  generateRevolveProfileMesh,
  generateSweepMesh,
  generateLoftMesh,
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
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!,
      y = vertices[i + 1]!,
      z = vertices[i + 2]!;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
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
        if (i < 34) {
          // bottom ring vertices
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

  describe('generateHoleMesh', () => {
    it('should produce a valid hole (cylinder) mesh', () => {
      const mesh = generateHoleMesh(5, 10);
      const { vertexCount, triangleCount } = validateMesh(mesh, 'hole');

      expect(vertexCount).toBe(66); // same as cylinder: 2 centers + 32*2 ring
      expect(triangleCount).toBe(128);
    });

    it('should respect diameter and depth', () => {
      const mesh = generateHoleMesh(6, 20);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.maxX - bounds.minX).toBeCloseTo(6, 1); // diameter
      expect(bounds.maxY - bounds.minY).toBeCloseTo(20, 1); // depth
    });

    it('should be centered vertically', () => {
      const mesh = generateHoleMesh(4, 8);
      const bounds = computeBounds(mesh.vertices);

      expect(bounds.minY).toBeCloseTo(-4, 5);
      expect(bounds.maxY).toBeCloseTo(4, 5);
    });

    it('should clamp very small values', () => {
      const mesh = generateHoleMesh(0, 0);
      validateMesh(mesh, 'tiny-hole');
    });
  });

  describe('Cross-cutting validations', () => {
    const generators = [
      { name: 'box', fn: () => generateBoxMesh(1, 1, 1) },
      { name: 'cylinder', fn: () => generateCylinderMesh(1, 1) },
      { name: 'sphere', fn: () => generateSphereMesh(1) },
      { name: 'cone', fn: () => generateConeMesh(1, 1) },
      { name: 'torus', fn: () => generateTorusMesh(1, 0.3) },
      { name: 'hole', fn: () => generateHoleMesh(5, 10) },
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

describe('generateExtrudeProfileMesh', () => {
  it('should generate a valid mesh from a rectangular profile', () => {
    const profile: Array<[number, number]> = [
      [0, 0], [2, 0], [2, 1], [0, 1],
    ];
    const mesh = generateExtrudeProfileMesh(profile, 3, 'xy');
    validateMesh(mesh, 'rectangle extrude');
    expect(mesh.indices.length / 3).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      expect(mesh.vertices[i]!).toBeGreaterThanOrEqual(-0.01);
      expect(mesh.vertices[i]!).toBeLessThanOrEqual(2.01);
      expect(mesh.vertices[i + 1]!).toBeGreaterThanOrEqual(-0.01);
      expect(mesh.vertices[i + 1]!).toBeLessThanOrEqual(1.01);
      expect(mesh.vertices[i + 2]!).toBeGreaterThanOrEqual(-0.01);
      expect(mesh.vertices[i + 2]!).toBeLessThanOrEqual(3.01);
    }
  });

  it('should generate a valid mesh on xz plane', () => {
    const profile: Array<[number, number]> = [
      [0, 0], [2, 0], [2, 1], [0, 1],
    ];
    const mesh = generateExtrudeProfileMesh(profile, 3, 'xz');
    validateMesh(mesh, 'rectangle extrude xz');
    expect(mesh.indices.length / 3).toBeGreaterThanOrEqual(12);
  });

  it('should generate a valid mesh on yz plane', () => {
    const profile: Array<[number, number]> = [
      [0, 0], [2, 0], [2, 1], [0, 1],
    ];
    const mesh = generateExtrudeProfileMesh(profile, 3, 'yz');
    validateMesh(mesh, 'rectangle extrude yz');
    expect(mesh.indices.length / 3).toBeGreaterThanOrEqual(12);
  });

  it('should handle triangular profile', () => {
    const profile: Array<[number, number]> = [
      [0, 0], [1, 0], [0.5, 1],
    ];
    const mesh = generateExtrudeProfileMesh(profile, 2, 'xy');
    validateMesh(mesh, 'triangle extrude');
    expect(mesh.indices.length / 3).toBeGreaterThanOrEqual(6);
  });

  it('should return empty mesh for insufficient points', () => {
    expect(generateExtrudeProfileMesh([], 1, 'xy').vertices.length).toBe(0);
    expect(generateExtrudeProfileMesh([[0, 0]], 1, 'xy').vertices.length).toBe(0);
    expect(generateExtrudeProfileMesh([[0, 0], [1, 0]], 1, 'xy').vertices.length).toBe(0);
  });

  it('should respect origin offset', () => {
    const profile: Array<[number, number]> = [
      [0, 0], [1, 0], [1, 1], [0, 1],
    ];
    const mesh = generateExtrudeProfileMesh(profile, 2, 'xy', [5, 10, 15]);
    validateMesh(mesh, 'rectangle with offset');
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      expect(mesh.vertices[i]!).toBeGreaterThanOrEqual(4.99);
      expect(mesh.vertices[i + 1]!).toBeGreaterThanOrEqual(9.99);
      expect(mesh.vertices[i + 2]!).toBeGreaterThanOrEqual(14.99);
    }
  });
});

describe('generateRevolveProfileMesh', () => {
  it('should generate a valid mesh from a profile', () => {
    const profile: Array<[number, number]> = [
      [0.5, 0], [0.5, 1], [1, 1], [1, 0],
    ];
    const mesh = generateRevolveProfileMesh(profile, 360, 'y', 16);
    validateMesh(mesh, 'full revolution');
    expect(mesh.indices.length / 3).toBeGreaterThan(0);
  });

  it('should generate a partial revolution', () => {
    const profile: Array<[number, number]> = [
      [0.5, 0], [0.5, 1],
    ];
    const mesh = generateRevolveProfileMesh(profile, 180, 'y', 16);
    validateMesh(mesh, 'half revolution');
    expect(mesh.indices.length / 3).toBeGreaterThan(0);
  });

  it('should revolve around different axes', () => {
    const profile: Array<[number, number]> = [
      [0.5, 0], [0.5, 1],
    ];
    validateMesh(generateRevolveProfileMesh(profile, 360, 'x', 8), 'revolve x');
    validateMesh(generateRevolveProfileMesh(profile, 360, 'z', 8), 'revolve z');
  });

  it('should return empty mesh for insufficient points', () => {
    expect(generateRevolveProfileMesh([], 360, 'y').vertices.length).toBe(0);
  });
});

// ============================================================
// Sweep mesh generator
// ============================================================

describe('generateSweepMesh', () => {
  const squareProfile: Array<[number, number]> = [
    [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5],
  ];
  const straightPath: Array<[number, number, number]> = [
    [0, 0, 0], [0, 5, 0],
  ];
  const curvedPath: Array<[number, number, number]> = [
    [0, 0, 0], [2, 2, 0], [4, 0, 0],
  ];

  it('should generate a valid mesh for a straight path', () => {
    const mesh = generateSweepMesh(squareProfile, straightPath, 8);
    validateMesh(mesh, 'sweep straight');
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it('should generate a valid mesh for a curved path', () => {
    const mesh = generateSweepMesh(squareProfile, curvedPath, 16);
    validateMesh(mesh, 'sweep curved');
    expect(mesh.vertices.length).toBeGreaterThan(0);
  });

  it('should return empty mesh for insufficient profile points', () => {
    const mesh = generateSweepMesh([[0, 0]], straightPath);
    expect(mesh.vertices.length).toBe(0);
  });

  it('should return empty mesh for insufficient path points', () => {
    const mesh = generateSweepMesh(squareProfile, [[0, 0, 0]]);
    expect(mesh.vertices.length).toBe(0);
  });

  it('should return empty mesh for zero-length path', () => {
    const mesh = generateSweepMesh(squareProfile, [[0, 0, 0], [0, 0, 0]]);
    expect(mesh.vertices.length).toBe(0);
  });

  it('should scale mesh size with segments', () => {
    const low = generateSweepMesh(squareProfile, curvedPath, 4);
    const high = generateSweepMesh(squareProfile, curvedPath, 16);
    // Higher segment count should produce more vertices
    expect(high.vertices.length).toBeGreaterThan(low.vertices.length);
  });

  it('should produce mesh with correct number of path stations', () => {
    const segments = 8;
    const mesh = generateSweepMesh(squareProfile, straightPath, segments);
    // Each station has profile.length vertices; segs+1 stations
    const expectedVertices = (segments + 1) * squareProfile.length;
    expect(mesh.vertices.length / 3).toBe(expectedVertices);
  });
});

// ============================================================
// Loft mesh generator
// ============================================================

describe('generateLoftMesh', () => {
  const bottomProfile: Array<[number, number, number]> = [
    [-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1],
  ];
  const topProfile: Array<[number, number, number]> = [
    [-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5],
  ];

  it('should generate a valid mesh for two profiles', () => {
    const mesh = generateLoftMesh([bottomProfile, topProfile]);
    validateMesh(mesh, 'loft two profiles');
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
  });

  it('should generate a valid mesh for three profiles', () => {
    const midProfile: Array<[number, number, number]> = [
      [-0.75, 0, -0.75], [0.75, 0, -0.75], [0.75, 0, 0.75], [-0.75, 0, 0.75],
    ];
    const mesh = generateLoftMesh([bottomProfile, midProfile, topProfile]);
    validateMesh(mesh, 'loft three profiles');
    expect(mesh.vertices.length).toBeGreaterThan(0);
  });

  it('should return empty mesh for fewer than 2 profiles', () => {
    expect(generateLoftMesh([]).vertices.length).toBe(0);
    expect(generateLoftMesh([bottomProfile]).vertices.length).toBe(0);
  });

  it('should return empty mesh for profiles with fewer than 3 points', () => {
    const tinyProfile: Array<[number, number, number]> = [[0, 0, 0], [1, 0, 0]];
    expect(generateLoftMesh([tinyProfile, tinyProfile]).vertices.length).toBe(0);
  });

  it('should return empty mesh for mismatched profile sizes', () => {
    const smallProfile: Array<[number, number, number]> = [[0, 0, 0], [1, 0, 0], [1, 0, 1]];
    expect(generateLoftMesh([bottomProfile, smallProfile]).vertices.length).toBe(0);
  });

  it('should produce mesh spanning the Y axis between profiles', () => {
    const mesh = generateLoftMesh([bottomProfile, topProfile]);
    const bounds = computeBounds(mesh.vertices);
    // Mesh should span Y axis (profiles placed at y=0 and y=2)
    expect(bounds.minY).toBeLessThan(bounds.maxY);
  });
});
