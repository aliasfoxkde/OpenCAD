import { describe, it, expect } from 'vitest';
import { computeMeshProperties } from './mass-properties';
import type { MeshData } from '../types/cad';

function makeMesh(
  vertices: number[],
  indices: number[],
  normals?: number[],
): MeshData {
  return {
    vertices: new Float32Array(vertices),
    normals: normals ? new Float32Array(normals) : new Float32Array(vertices.length),
    indices: new Uint32Array(indices),
    featureId: 'test',
  };
}

describe('computeMeshProperties', () => {
  it('computes volume of a unit cube', () => {
    // Unit cube with 12 triangles (2 per face)
    const mesh = makeMesh(
      [
        // Front face
        -1, -1, 1,  1, -1, 1,  1, 1, 1,
        -1, -1, 1,  1, 1, 1,  -1, 1, 1,
        // Back face
        1, -1, -1,  -1, -1, -1,  -1, 1, -1,
        1, -1, -1,  -1, 1, -1,  1, 1, -1,
        // Top face
        -1, 1, 1,  1, 1, 1,  1, 1, -1,
        -1, 1, 1,  1, 1, -1,  -1, 1, -1,
        // Bottom face
        -1, -1, -1,  1, -1, -1,  1, -1, 1,
        -1, -1, -1,  1, -1, 1,  -1, -1, 1,
        // Right face
        1, -1, 1,  1, -1, -1,  1, 1, -1,
        1, -1, 1,  1, 1, -1,  1, 1, 1,
        // Left face
        -1, -1, -1,  -1, -1, 1,  -1, 1, 1,
        -1, -1, -1,  -1, 1, 1,  -1, 1, -1,
      ],
      Array.from({ length: 36 }, (_, i) => i),
    );

    const props = computeMeshProperties(mesh);
    // Unit cube (side length 2, centered at origin) has volume 8
    expect(props.volume).toBeCloseTo(8, 0.1);
  });

  it('computes surface area of a unit cube', () => {
    const mesh = makeMesh(
      [
        -1, -1, 1,  1, -1, 1,  1, 1, 1,
        -1, -1, 1,  1, 1, 1,  -1, 1, 1,
        1, -1, -1,  -1, -1, -1,  -1, 1, -1,
        1, -1, -1,  -1, 1, -1,  1, 1, -1,
        -1, 1, 1,  1, 1, 1,  1, 1, -1,
        -1, 1, 1,  1, 1, -1,  -1, 1, -1,
        -1, -1, -1,  1, -1, -1,  1, -1, 1,
        -1, -1, -1,  1, -1, 1,  -1, -1, 1,
        1, -1, 1,  1, -1, -1,  1, 1, -1,
        1, -1, 1,  1, 1, -1,  1, 1, 1,
        -1, -1, -1,  -1, -1, 1,  -1, 1, 1,
        -1, -1, -1,  -1, 1, 1,  -1, 1, -1,
      ],
      Array.from({ length: 36 }, (_, i) => i),
    );

    const props = computeMeshProperties(mesh);
    // Unit cube (side length 2) has surface area 6 * 4 = 24
    expect(props.surfaceArea).toBeCloseTo(24, 0.1);
  });

  it('computes bounding box', () => {
    const mesh = makeMesh(
      [0, 0, 0, 2, 0, 0, 1, 3, 0],
      [0, 1, 2],
    );

    const props = computeMeshProperties(mesh);
    expect(props.boundingBox).not.toBeNull();
    expect(props.boundingBox!.minX).toBe(0);
    expect(props.boundingBox!.minY).toBe(0);
    expect(props.boundingBox!.minZ).toBe(0);
    expect(props.boundingBox!.maxX).toBe(2);
    expect(props.boundingBox!.maxY).toBe(3);
    expect(props.boundingBox!.maxZ).toBe(0);
  });

  it('computes center of mass as bounding box centroid', () => {
    const mesh = makeMesh(
      [0, 0, 0, 4, 0, 0, 2, 6, 0],
      [0, 1, 2],
    );

    const props = computeMeshProperties(mesh);
    expect(props.centerOfMass).not.toBeNull();
    expect(props.centerOfMass!.x).toBeCloseTo(2, 0.01);
    expect(props.centerOfMass!.y).toBeCloseTo(3, 0.01);
    expect(props.centerOfMass!.z).toBeCloseTo(0, 0.01);
  });

  it('computes triangle and vertex counts', () => {
    const mesh = makeMesh(
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0],
      [0, 1, 2, 0, 2, 3],
    );

    const props = computeMeshProperties(mesh);
    expect(props.triangleCount).toBe(2);
    expect(props.vertexCount).toBe(4);
  });

  it('returns zero for empty mesh', () => {
    const mesh = makeMesh([], []);

    const props = computeMeshProperties(mesh);
    expect(props.volume).toBe(0);
    expect(props.surfaceArea).toBe(0);
    expect(props.boundingBox).not.toBeNull();
    // Infinity values from empty vertex set
    expect(props.boundingBox!.minX).toBe(Infinity);
    expect(props.centerOfMass!.x).toBeNaN();
  });

  it('computes volume for a single triangle (tetrahedron with origin)', () => {
    const mesh = makeMesh(
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [0, 1, 2],
    );

    const props = computeMeshProperties(mesh);
    // The signed volume of the tetrahedron (origin, v1, v2, v3) is 1/6
    expect(props.volume).toBeCloseTo(1 / 6, 0.001);
  });

  it('computes surface area for equilateral triangle', () => {
    const s = 2;
    const h = s * Math.sqrt(3) / 2;
    const mesh = makeMesh(
      [0, 0, 0, s, 0, 0, s / 2, h, 0],
      [0, 1, 2],
    );

    const props = computeMeshProperties(mesh);
    expect(props.surfaceArea).toBeCloseTo(s * h / 2, 0.001);
  });
});
