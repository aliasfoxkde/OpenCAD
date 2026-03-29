/**
 * CAD Kernel Worker - runs opencascade.js in a Web Worker
 * to avoid blocking the main thread during geometry operations.
 *
 * For Phase 1, this uses Three.js primitives as placeholders.
 * Phase 2 will integrate the actual opencascade.js WASM kernel.
 */

import type { WorkerRequest, WorkerResponse } from '../../types/worker';

let initialized = false;

function handleMessage(event: MessageEvent<WorkerRequest>): void {
  const request = event.data;

  switch (request.type) {
    case 'init':
      initialized = true;
      postResponse({ type: 'ready' });
      break;

    case 'create_primitive':
      if (!initialized) {
        postResponse({ type: 'error', message: 'Kernel not initialized' });
        return;
      }
      handleCreatePrimitive(request.id, request.primitive, request.params);
      break;

    case 'delete_shape':
      postResponse({ type: 'shape_deleted', id: request.id });
      break;

    case 'tessellate':
      handleTessellate(request.id);
      break;

    default:
      postResponse({
        type: 'error',
        message: `Unknown request type: ${(request as { type: string }).type}`,
      });
  }
}

function handleCreatePrimitive(
  id: string,
  primitive: string,
  params: Record<string, number>,
): void {
  // Phase 1: Store primitive definition for tessellation
  // Phase 2: Create actual OCCT shapes
  void primitive;
  void params;
  primitives.set(id, { primitive, params });
  postResponse({ type: 'shape_created', id });
}

const primitives = new Map<
  string,
  { primitive: string; params: Record<string, number> }
>();

function handleTessellate(id: string): void {
  const def = primitives.get(id);
  if (!def) {
    postResponse({
      type: 'tessellation_error',
      id,
      message: `No shape found for id: ${id}`,
    });
    return;
  }

  // Phase 1: Generate simple tessellation data for Three.js
  // Phase 2: Use OCCT's BRepMesh_IncrementalMesh for real tessellation
  const mesh = generatePlaceholderMesh(def.primitive, def.params);
  postResponse({ type: 'tessellation_result', id, mesh });
}

function generatePlaceholderMesh(
  primitive: string,
  params: Record<string, number>,
): import('../../types/cad').MeshData {
  // Simple mesh generation for Phase 1
  // These will be replaced by OCCT tessellation in Phase 2
  switch (primitive) {
    case 'box': {
      const w = params.width ?? 1;
      const h = params.height ?? 1;
      const d = params.depth ?? 1;
      return generateBoxMesh(w, h, d);
    }
    case 'cylinder': {
      const r = params.radius ?? 0.5;
      const h = params.height ?? 1;
      return generateCylinderMesh(r, h);
    }
    case 'sphere': {
      const r = params.radius ?? 0.5;
      return generateSphereMesh(r);
    }
    case 'cone': {
      const r = params.radius ?? 0.5;
      const h = params.height ?? 1;
      return generateConeMesh(r, h);
    }
    case 'torus': {
      const r = params.radius ?? 0.5;
      const t = params.tube ?? 0.15;
      return generateTorusMesh(r, t);
    }
    default:
      return generateBoxMesh(1, 1, 1);
  }
}

function generateBoxMesh(
  w: number,
  h: number,
  d: number,
): import('../../types/cad').MeshData {
  const hw = w / 2,
    hh = h / 2,
    hd = d / 2;

  // 8 vertices of a box
  const vertices = new Float32Array([
    -hw, -hh, -hd, hw, -hh, -hd, hw, hh, -hd, -hw, hh, -hd, // back
    -hw, -hh, hd, hw, -hh, hd, hw, hh, hd, -hw, hh, hd, // front
  ]);

  const normals = new Float32Array([
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, // back
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, // front
  ]);

  // 12 triangles (2 per face, 6 faces)
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2, // back
    4, 5, 6, 4, 6, 7, // front
    0, 1, 5, 0, 5, 4, // bottom
    2, 3, 7, 2, 7, 6, // top
    0, 4, 7, 0, 7, 3, // left
    1, 2, 6, 1, 6, 5, // right
  ]);

  return { vertices, normals, indices, featureId: '' };
}

function generateCylinderMesh(
  radius: number,
  height: number,
): import('../../types/cad').MeshData {
  const segments = 32;
  const vertexCount = segments * 2 + 2; // top/bottom circles + center vertices
  const vertices = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);

  const hh = height / 2;

  // Bottom center (index 0)
  vertices[0] = 0;
  vertices[1] = -hh;
  vertices[2] = 0;
  normals[0] = 0;
  normals[1] = -1;
  normals[2] = 0;

  // Top center (index 1)
  vertices[3] = 0;
  vertices[4] = hh;
  vertices[5] = 0;
  normals[3] = 0;
  normals[4] = 1;
  normals[5] = 0;

  // Bottom ring (indices 2..segments+1)
  // Top ring (indices segments+2..2*segments+1)
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Bottom vertex
    const bi = (2 + i) * 3;
    vertices[bi] = x;
    vertices[bi + 1] = -hh;
    vertices[bi + 2] = z;
    normals[bi] = Math.cos(angle);
    normals[bi + 1] = 0;
    normals[bi + 2] = Math.sin(angle);

    // Top vertex
    const ti = (2 + segments + i) * 3;
    vertices[ti] = x;
    vertices[ti + 1] = hh;
    vertices[ti + 2] = z;
    normals[ti] = Math.cos(angle);
    normals[ti + 1] = 0;
    normals[ti + 2] = Math.sin(angle);
  }

  const indices: number[] = [];

  // Bottom cap triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, 2 + i, 2 + next);
  }

  // Top cap triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(1, 2 + segments + next, 2 + segments + i);
  }

  // Side triangles
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    const bl = 2 + i;
    const br = 2 + next;
    const tl = 2 + segments + i;
    const tr = 2 + segments + next;
    indices.push(bl, br, tl);
    indices.push(br, tr, tl);
  }

  return {
    vertices,
    normals,
    indices: new Uint32Array(indices),
    featureId: '',
  };
}

function generateSphereMesh(
  radius: number,
): import('../../types/cad').MeshData {
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

function generateConeMesh(
  radius: number,
  height: number,
): import('../../types/cad').MeshData {
  // Reuse cylinder with top radius of 0
  const segments = 32;
  const hh = height / 2;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Bottom center
  vertices.push(0, -hh, 0);
  normals.push(0, -1, 0);

  // Tip
  vertices.push(0, hh, 0);
  const slopeLen = Math.sqrt(radius * radius + height * height);
  normals.push(radius / slopeLen, height / slopeLen, 0);

  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    vertices.push(x, -hh, z);
    normals.push(Math.cos(angle), height / slopeLen, Math.sin(angle));
  }

  // Bottom cap
  for (let i = 1; i <= segments; i++) {
    indices.push(0, 2 + i, 2 + i - 1);
  }

  // Side triangles
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

function generateTorusMesh(
  radius: number,
  tube: number,
): import('../../types/cad').MeshData {
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

function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

self.onmessage = handleMessage;
