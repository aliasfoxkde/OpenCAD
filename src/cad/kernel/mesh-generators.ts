/**
 * Mesh generators for primitive shapes.
 *
 * These produce MeshData suitable for Three.js rendering.
 * Phase 2 will replace these with OCCT BRepMesh_IncrementalMesh tessellation.
 */

import type { MeshData } from '../../types/cad';

export function generateBoxMesh(width: number, height: number, depth: number): MeshData {
  const hw = width / 2, hh = height / 2, hd = depth / 2;

  const vertices = new Float32Array([
    -hw, -hh, -hd, hw, -hh, -hd, hw, hh, -hd, -hw, hh, -hd,
    -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
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

  return { vertices, normals, indices, featureId: '' };
}

export function generateCylinderMesh(radius: number, height: number): MeshData {
  const segments = 32;
  const vertexCount = segments * 2 + 2;
  const vertices = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const hh = height / 2;

  vertices[0] = 0; vertices[1] = -hh; vertices[2] = 0;
  normals[0] = 0; normals[1] = -1; normals[2] = 0;

  vertices[3] = 0; vertices[4] = hh; vertices[5] = 0;
  normals[3] = 0; normals[4] = 1; normals[5] = 0;

  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const bi = (2 + i) * 3;
    vertices[bi] = x; vertices[bi + 1] = -hh; vertices[bi + 2] = z;
    normals[bi] = Math.cos(angle); normals[bi + 1] = 0; normals[bi + 2] = Math.sin(angle);

    const ti = (2 + segments + i) * 3;
    vertices[ti] = x; vertices[ti + 1] = hh; vertices[ti + 2] = z;
    normals[ti] = Math.cos(angle); normals[ti + 1] = 0; normals[ti + 2] = Math.sin(angle);
  }

  const indices: number[] = [];

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, 2 + i, 2 + next);
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(1, 2 + segments + next, 2 + segments + i);
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const bl = 2 + i, br = 2 + next;
    const tl = 2 + segments + i, tr = 2 + segments + next;
    indices.push(bl, br, tl);
    indices.push(br, tr, tl);
  }

  return { vertices, normals, indices: new Uint32Array(indices), featureId: '' };
}

export function generateSphereMesh(radius: number): MeshData {
  const widthSegments = 32;
  const heightSegments = 16;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * 2 * Math.PI;

      const nx = -Math.cos(theta) * Math.sin(phi);
      const ny = Math.cos(phi);
      const nz = Math.sin(theta) * Math.sin(phi);

      normals.push(nx, ny, nz);
      vertices.push(nx * radius, ny * radius, nz * radius);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + 1;
      const c = a + widthSegments + 1;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    featureId: '',
  };
}

export function generateConeMesh(radius: number, height: number): MeshData {
  const segments = 32;
  const hh = height / 2;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  vertices.push(0, -hh, 0);
  normals.push(0, -1, 0);

  // Slope normal: direction from surface point toward outside
  // For a cone with slope angle alpha, the outward normal has components:
  //   radial component = sin(alpha) = radius/slopeLen
  //   axial component = cos(alpha) = height/slopeLen
  const slopeLen = Math.sqrt(radius * radius + height * height);
  const nRadial = radius / slopeLen;
  const nAxial = height / slopeLen;

  vertices.push(0, hh, 0);
  normals.push(0, 1, 0);

  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    vertices.push(x, -hh, z);
    // Normal = (nRadial*cos, nAxial, nRadial*sin) — already unit length
    normals.push(nRadial * Math.cos(angle), nAxial, nRadial * Math.sin(angle));
  }

  for (let i = 1; i <= segments; i++) {
    indices.push(0, 2 + i, 2 + i - 1);
  }

  for (let i = 0; i < segments; i++) {
    const next = 2 + i + 1;
    indices.push(2 + i, next, 1);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    featureId: '',
  };
}

export function generateTorusMesh(radius: number, tube: number): MeshData {
  const radialSegments = 48;
  const tubularSegments = 16;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= radialSegments; j++) {
    const u = (j / radialSegments) * Math.PI * 2;
    for (let i = 0; i <= tubularSegments; i++) {
      const v = (i / tubularSegments) * Math.PI * 2;

      const x = (radius + tube * Math.cos(v)) * Math.cos(u);
      const y = tube * Math.sin(v);
      const z = (radius + tube * Math.cos(v)) * Math.sin(u);

      const nx = Math.cos(v) * Math.cos(u);
      const ny = Math.sin(v);
      const nz = Math.cos(v) * Math.sin(u);

      vertices.push(x, y, z);
      normals.push(nx, ny, nz);
    }
  }

  for (let j = 0; j < radialSegments; j++) {
    for (let i = 0; i < tubularSegments; i++) {
      const a = j * (tubularSegments + 1) + i;
      const b = a + 1;
      const c = a + tubularSegments + 1;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    featureId: '',
  };
}

export function generateHoleMesh(diameter: number, depth: number): MeshData {
  const radius = Math.max(0.001, diameter / 2);
  const height = Math.max(0.001, depth);
  const segments = 32;
  const vertexCount = segments * 2 + 2;
  const vertices = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const hh = height / 2;

  vertices[0] = 0; vertices[1] = -hh; vertices[2] = 0;
  normals[0] = 0; normals[1] = -1; normals[2] = 0;

  vertices[3] = 0; vertices[4] = hh; vertices[5] = 0;
  normals[3] = 0; normals[4] = 1; normals[5] = 0;

  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const bi = (2 + i) * 3;
    vertices[bi] = x; vertices[bi + 1] = -hh; vertices[bi + 2] = z;
    normals[bi] = Math.cos(angle); normals[bi + 1] = 0; normals[bi + 2] = Math.sin(angle);

    const ti = (2 + segments + i) * 3;
    vertices[ti] = x; vertices[ti + 1] = hh; vertices[ti + 2] = z;
    normals[ti] = Math.cos(angle); normals[ti + 1] = 0; normals[ti + 2] = Math.sin(angle);
  }

  const indices: number[] = [];

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, 2 + i, 2 + next);
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(1, 2 + segments + next, 2 + segments + i);
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const bl = 2 + i, br = 2 + next;
    const tl = 2 + segments + i, tr = 2 + segments + next;
    indices.push(bl, br, tl);
    indices.push(br, tr, tl);
  }

  return { vertices, normals, indices: new Uint32Array(indices), featureId: '' };
}
