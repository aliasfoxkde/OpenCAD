/**
 * Mesh generators for primitive shapes.
 *
 * These produce MeshData suitable for Three.js rendering.
 * Phase 2 will replace these with OCCT BRepMesh_IncrementalMesh tessellation.
 */

import type { MeshData } from '../../types/cad';

export function generateBoxMesh(width: number, height: number, depth: number): MeshData {
  const hw = width / 2,
    hh = height / 2,
    hd = depth / 2;

  const vertices = new Float32Array([
    -hw, -hh, -hd, hw, -hh, -hd, hw, hh, -hd, -hw, hh, -hd, -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd,
  ]);

  const normals = new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);

  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
  ]);

  return { vertices, normals, indices, featureId: '' };
}

export function generateCylinderMesh(radius: number, height: number): MeshData {
  const segments = 32;
  const vertexCount = segments * 2 + 2;
  const vertices = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const hh = height / 2;

  vertices[0] = 0;
  vertices[1] = -hh;
  vertices[2] = 0;
  normals[0] = 0;
  normals[1] = -1;
  normals[2] = 0;

  vertices[3] = 0;
  vertices[4] = hh;
  vertices[5] = 0;
  normals[3] = 0;
  normals[4] = 1;
  normals[5] = 0;

  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const bi = (2 + i) * 3;
    vertices[bi] = x;
    vertices[bi + 1] = -hh;
    vertices[bi + 2] = z;
    normals[bi] = Math.cos(angle);
    normals[bi + 1] = 0;
    normals[bi + 2] = Math.sin(angle);

    const ti = (2 + segments + i) * 3;
    vertices[ti] = x;
    vertices[ti + 1] = hh;
    vertices[ti + 2] = z;
    normals[ti] = Math.cos(angle);
    normals[ti + 1] = 0;
    normals[ti + 2] = Math.sin(angle);
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
    const bl = 2 + i,
      br = 2 + next;
    const tl = 2 + segments + i,
      tr = 2 + segments + next;
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

  vertices[0] = 0;
  vertices[1] = -hh;
  vertices[2] = 0;
  normals[0] = 0;
  normals[1] = -1;
  normals[2] = 0;

  vertices[3] = 0;
  vertices[4] = hh;
  vertices[5] = 0;
  normals[3] = 0;
  normals[4] = 1;
  normals[5] = 0;

  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const bi = (2 + i) * 3;
    vertices[bi] = x;
    vertices[bi + 1] = -hh;
    vertices[bi + 2] = z;
    normals[bi] = Math.cos(angle);
    normals[bi + 1] = 0;
    normals[bi + 2] = Math.sin(angle);

    const ti = (2 + segments + i) * 3;
    vertices[ti] = x;
    vertices[ti + 1] = hh;
    vertices[ti + 2] = z;
    normals[ti] = Math.cos(angle);
    normals[ti + 1] = 0;
    normals[ti + 2] = Math.sin(angle);
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
    const bl = 2 + i,
      br = 2 + next;
    const tl = 2 + segments + i,
      tr = 2 + segments + next;
    indices.push(bl, br, tl);
    indices.push(br, tr, tl);
  }

  return { vertices, normals, indices: new Uint32Array(indices), featureId: '' };
}

/**
 * Generate a cylinder mesh for fillet along an axis-aligned edge.
 * The cylinder is oriented along the given axis at the given position.
 */
export function generateFilletCylinderMesh(
  radius: number,
  length: number,
  axis: 'x' | 'y' | 'z',
  position: [number, number, number],
  segments = 16,
): MeshData {
  const r = Math.max(0.001, radius);
  const l = Math.max(0.001, length);
  const segs = Math.max(6, segments);
  const halfL = l / 2;
  const vertices = new Float32Array(segs * 2 * 3);
  const normals = new Float32Array(segs * 2 * 3);

  for (let i = 0; i < segs; i++) {
    const angle = (2 * Math.PI * i) / segs;
    let x: number, y: number, z: number;
    let nx: number, ny: number, nz: number;

    if (axis === 'y') {
      x = Math.cos(angle) * r; y = -halfL; z = Math.sin(angle) * r;
      nx = Math.cos(angle); ny = 0; nz = Math.sin(angle);
    } else if (axis === 'x') {
      x = -halfL; y = Math.cos(angle) * r; z = Math.sin(angle) * r;
      nx = 0; ny = Math.cos(angle); nz = Math.sin(angle);
    } else {
      x = Math.cos(angle) * r; y = Math.sin(angle) * r; z = -halfL;
      nx = Math.cos(angle); ny = Math.sin(angle); nz = 0;
    }

    const bi = i * 3;
    vertices[bi] = x + position[0]; vertices[bi + 1] = y + position[1]; vertices[bi + 2] = z + position[2];
    normals[bi] = nx; normals[bi + 1] = ny; normals[bi + 2] = nz;

    const ti = (segs + i) * 3;
    if (axis === 'y') { vertices[ti] = x + position[0]; vertices[ti + 1] = halfL + position[1]; vertices[ti + 2] = z + position[2]; }
    else if (axis === 'x') { vertices[ti] = halfL + position[0]; vertices[ti + 1] = y + position[1]; vertices[ti + 2] = z + position[2]; }
    else { vertices[ti] = x + position[0]; vertices[ti + 1] = y + position[1]; vertices[ti + 2] = halfL + position[2]; }
    normals[ti] = nx; normals[ti + 1] = ny; normals[ti + 2] = nz;
  }

  const indices: number[] = [];
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    indices.push(i, next, segs + i, next, segs + next, segs + i);
  }

  return { vertices, normals, indices: new Uint32Array(indices), featureId: '' };
}

/**
 * Generate a wedge mesh for chamfer along an axis-aligned edge.
 */
export function generateChamferWedgeMesh(
  distance: number,
  length: number,
  axis: 'x' | 'y' | 'z',
  position: [number, number, number],
  corner: '+' | '-',
): MeshData {
  const d = Math.max(0.001, distance);
  const l = Math.max(0.001, length);
  const halfL = l / 2;
  const s = corner === '+' ? 1 : -1;

  let verts: number[];
  let norms: number[];

  if (axis === 'y') {
    verts = [0,-halfL,0, s*d,-halfL,0, 0,-halfL,s*d, 0,halfL,0, s*d,halfL,0, 0,halfL,s*d];
    norms = [-s/Math.SQRT2,0,-1/Math.SQRT2, 0,-1,0, -1/Math.SQRT2,0,-s/Math.SQRT2,
             -s/Math.SQRT2,0,-1/Math.SQRT2, 0,1,0, -1/Math.SQRT2,0,-s/Math.SQRT2];
  } else if (axis === 'x') {
    verts = [0,0,0, 0,s*d,0, 0,0,s*d, 0,0,0, 0,s*d,0, 0,0,s*d];
    norms = [0,-s/Math.SQRT2,-1/Math.SQRT2, 0,-1/Math.SQRT2,-s/Math.SQRT2, -1,0,0,
             0,-s/Math.SQRT2,-1/Math.SQRT2, 0,-1/Math.SQRT2,-s/Math.SQRT2, 1,0,0];
  } else {
    verts = [0,0,0, s*d,0,0, 0,s*d,0, 0,0,0, s*d,0,0, 0,s*d,0];
    norms = [-s/Math.SQRT2,-1/Math.SQRT2,0, -1/Math.SQRT2,-s/Math.SQRT2,0, 0,0,-1,
             -s/Math.SQRT2,-1/Math.SQRT2,0, -1/Math.SQRT2,-s/Math.SQRT2,0, 0,0,1];
  }

  const floatVerts = new Float32Array(verts.length);
  for (let i = 0; i < verts.length; i += 3) {
    floatVerts[i] = verts[i]! + position[0];
    floatVerts[i + 1] = verts[i + 1]! + position[1];
    floatVerts[i + 2] = verts[i + 2]! + position[2];
  }

  return {
    vertices: floatVerts,
    normals: new Float32Array(norms),
    indices: new Uint32Array([0,1,2, 3,5,4, 0,2,5, 0,5,3, 0,3,4, 0,4,1, 1,4,5, 1,5,2]),
    featureId: '',
  };
}

// ============================================================
// Sketch-based mesh generators
// ============================================================

/**
 * Ear-clipping triangulation of a simple 2D polygon.
 * Returns array of triangle indices into the input points.
 */
function triangulatePolygon(points: Array<[number, number]>): Array<[number, number, number]> {
  const n = points.length;
  if (n < 3) return [];

  // For convex polygons, fan triangulation is sufficient
  const indices: Array<[number, number, number]> = [];
  if (n === 3) {
    indices.push([0, 1, 2]);
    return indices;
  }

  // Use fan triangulation from centroid for convex, ear-clipping for concave
  // Simple ear-clipping algorithm
  const remaining = points.map((_, i) => i);
  const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;

  let maxIter = remaining.length * 3;
  while (remaining.length > 3 && maxIter-- > 0) {
    let earFound = false;
    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i - 1 + remaining.length) % remaining.length]!;
      const curr = remaining[i]!;
      const next = remaining[(i + 1) % remaining.length]!;

      const p1 = points[prev]!;
      const p2 = points[curr]!;
      const p3 = points[next]!;

      // Check if ear is convex (cross product > 0 for CCW)
      const dx1 = p2[0] - p1[0], dy1 = p2[1] - p1[1];
      const dx2 = p3[0] - p2[0], dy2 = p3[1] - p2[1];
      const crossVal = cross(dx1, dy1, dx2, dy2);
      if (crossVal <= 0) continue;

      // Check no other point is inside the triangle
      let inside = false;
      for (let j = 0; j < remaining.length; j++) {
        const idx = remaining[j]!;
        if (idx === prev || idx === curr || idx === next) continue;
        const pt = points[idx]!;
        // Point-in-triangle test using barycentric coordinates
        const v0x = p3[0] - p1[0], v0y = p3[1] - p1[1];
        const v1x = p2[0] - p1[0], v1y = p2[1] - p1[1];
        const v2x = pt[0] - p1[0], v2y = pt[1] - p1[1];
        const d00 = v0x * v0x + v0y * v0y;
        const d01 = v0x * v1x + v0y * v1y;
        const d02 = v0x * v2x + v0y * v2y;
        const d11 = v1x * v1x + v1y * v1y;
        const d12 = v1x * v2x + v1y * v2y;
        const inv = 1 / (d00 * d11 - d01 * d01);
        const u = (d11 * d02 - d01 * d12) * inv;
        const v = (d00 * d12 - d01 * d02) * inv;
        if (u >= 0 && v >= 0 && u + v <= 1) {
          inside = true;
          break;
        }
      }

      if (!inside) {
        indices.push([prev, curr, next]);
        remaining.splice(i, 1);
        earFound = true;
        break;
      }
    }
    if (!earFound) break; // Degenerate polygon
  }

  if (remaining.length === 3) {
    indices.push([remaining[0]!, remaining[1]!, remaining[2]!]);
  }

  return indices;
}

/**
 * Generate a mesh by extruding a 2D polygon profile along a plane normal.
 * The polygon is defined in 2D sketch coordinates and extruded into 3D.
 */
export function generateExtrudeProfileMesh(
  profile2D: Array<[number, number]>,
  depth: number,
  plane: 'xy' | 'xz' | 'yz' = 'xy',
  origin: [number, number, number] = [0, 0, 0],
): MeshData {
  if (profile2D.length < 3) {
    return { vertices: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0), featureId: '' };
  }

  // Ensure polygon is wound CCW
  const signedArea = profile2D.reduce((sum, p, i) => {
    const next = profile2D[(i + 1) % profile2D.length]!;
    return sum + (next[0] - p[0]) * (next[1] + p[1]);
  }, 0);
  const profile = signedArea > 0 ? [...profile2D].reverse() : [...profile2D];

  const tris = triangulatePolygon(profile);
  const n = profile.length;

  // Map 2D profile to 3D coordinates based on plane
  const mapTo3D = (x: number, y: number, z: number): [number, number, number] => {
    switch (plane) {
      case 'xy': return [x + origin[0], y + origin[1], z + origin[2]];
      case 'xz': return [x + origin[0], z + origin[1], y + origin[2]];
      case 'yz': return [z + origin[0], x + origin[1], y + origin[2]];
    }
  };

  // Build vertices: bottom ring (z=0) + top ring (z=depth)
  const verts: number[] = [];

  // Bottom vertices (z = 0)
  for (const [x, y] of profile) {
    const [vx, vy, vz] = mapTo3D(x, y, 0);
    verts.push(vx, vy, vz);
  }

  // Top vertices (z = depth)
  for (const [x, y] of profile) {
    const [vx, vy, vz] = mapTo3D(x, y, depth);
    verts.push(vx, vy, vz);
  }

  // Normals for side faces (computed per-face later from indices)
  // For bottom cap: normal pointing -Z
  // For top cap: normal pointing +Z
  const indices: number[] = [];

  // Bottom cap triangles (reversed winding for outward normal)
  for (const [a, b, c] of tris) {
    indices.push(a, c, b);
  }

  // Top cap triangles
  for (const [a, b, c] of tris) {
    indices.push(a + n, b + n, c + n);
  }

  // Side faces
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const bl = i, br = next;
    const tl = i + n, tr = next + n;

    // Get edge direction for normal
    const p1 = profile[i]!;
    const p2 = profile[next]!;
    const edx = p2[0] - p1[0], edy = p2[1] - p1[1];
    const len = Math.sqrt(edx * edx + edy * edy);
    if (len < 1e-10) continue;

    // Outward normal in 2D (perpendicular to edge, pointing away from polygon center)
    // Normals are computed from geometry via computeNormals

    // Two triangles per side
    indices.push(bl, br, tl);
    indices.push(br, tr, tl);
  }

  // Compute normals from geometry
  const vertices = new Float32Array(verts);
  const normalsArr = computeNormals(vertices, new Uint32Array(indices));
  const normalFloats = new Float32Array(normalsArr.length);
  for (let i = 0; i < normalsArr.length; i++) normalFloats[i] = normalsArr[i]!;

  return { vertices, normals: normalFloats, indices: new Uint32Array(indices), featureId: '' };
}

/**
 * Generate a mesh by revolving a 2D polygon profile around an axis.
 * The profile is in 2D and revolved by the given angle.
 */
export function generateRevolveProfileMesh(
  profile2D: Array<[number, number]>,
  angle: number,
  axis: 'x' | 'y' | 'z' = 'y',
  segments: number = 32,
  origin: [number, number, number] = [0, 0, 0],
): MeshData {
  if (profile2D.length < 2) {
    return { vertices: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0), featureId: '' };
  }

  const segs = Math.max(6, segments);
  const angleRad = Math.min(angle, 360) * (Math.PI / 180);
  const n = profile2D.length;

  const verts: number[] = [];
  const indices: number[] = [];

  // For revolve, profile is (distance_from_axis, height_along_axis)
  // Map based on axis
  for (let s = 0; s <= segs; s++) {
    const theta = (s / segs) * angleRad;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    for (const [r, h] of profile2D) {
      const dist = r; // distance from axis
      let x: number, y: number, z: number;

      switch (axis) {
        case 'y':
          x = dist * cosT;
          y = h;
          z = dist * sinT;
          break;
        case 'x':
          x = h;
          y = dist * cosT;
          z = dist * sinT;
          break;
        case 'z':
          x = dist * cosT;
          y = dist * sinT;
          z = h;
          break;
      }

      verts.push(x + origin[0], y + origin[1], z + origin[2]);
    }
  }

  // Generate triangles
  for (let s = 0; s < segs; s++) {
    for (let i = 0; i < n - 1; i++) {
      const a = s * n + i;
      const b = s * n + i + 1;
      const c = (s + 1) * n + i;
      const d = (s + 1) * n + i + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const vertices = new Float32Array(verts);
  const normalsArr = computeNormals(vertices, new Uint32Array(indices));
  const normalFloats = new Float32Array(normalsArr.length);
  for (let i = 0; i < normalsArr.length; i++) normalFloats[i] = normalsArr[i]!;

  return { vertices, normals: normalFloats, indices: new Uint32Array(indices), featureId: '' };
}

/**
 * Compute flat normals for a triangle mesh.
 */
function computeNormals(vertices: Float32Array, indices: Uint32Array): number[] {
  const normals = new Array(vertices.length).fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i]! * 3;
    const i1 = indices[i + 1]! * 3;
    const i2 = indices[i + 2]! * 3;

    const ax = vertices[i1]! - vertices[i0]!;
    const ay = vertices[i1 + 1]! - vertices[i0 + 1]!;
    const az = vertices[i1 + 2]! - vertices[i0 + 2]!;
    const bx = vertices[i2]! - vertices[i0]!;
    const by = vertices[i2 + 1]! - vertices[i0 + 1]!;
    const bz = vertices[i2 + 2]! - vertices[i0 + 2]!;

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    for (const idx of [i0, i1, i2]) {
      normals[idx]! += nx / len;
      normals[idx + 1]! += ny / len;
      normals[idx + 2]! += nz / len;
    }
  }

  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(normals[i]! ** 2 + normals[i + 1]! ** 2 + normals[i + 2]! ** 2) || 1;
    normals[i]! /= len;
    normals[i + 1]! /= len;
    normals[i + 2]! /= len;
  }

  return normals;
}
