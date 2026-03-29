/**
 * STL Binary Exporter — converts MeshData to binary STL format.
 *
 * Binary STL format:
 * - 80 byte header
 * - 4 byte uint32 triangle count
 * - For each triangle: 12 bytes normal (3 float32) + 36 bytes vertices (9 float32) + 2 bytes attribute
 */

import type { MeshData } from '../../types/cad';

const STL_HEADER_SIZE = 80;
const STL_TRIANGLE_SIZE = 50; // 12 (normal) + 36 (3 vertices) + 2 (attribute)
const STL_FLOAT_SIZE = 4;

export function exportSTL(mesh: MeshData): ArrayBuffer {
  const triangleCount = Math.floor(mesh.indices.length / 3);

  const buffer = new ArrayBuffer(STL_HEADER_SIZE + 4 + triangleCount * STL_TRIANGLE_SIZE);
  const view = new DataView(buffer);

  // Header — 80 bytes, can be anything
  const header = 'OpenCAD STL Export';
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(header);
  for (let i = 0; i < STL_HEADER_SIZE; i++) {
    view.setUint8(i, headerBytes[i] ?? 0);
  }

  // Triangle count
  view.setUint32(STL_HEADER_SIZE, triangleCount, true);

  let offset = STL_HEADER_SIZE + 4;

  for (let i = 0; i < triangleCount; i++) {
    const i0 = mesh.indices[i * 3]!;
    const i1 = mesh.indices[i * 3 + 1]!;
    const i2 = mesh.indices[i * 3 + 2]!;

    const v0x = mesh.vertices[i0 * 3]!;
    const v0y = mesh.vertices[i0 * 3 + 1]!;
    const v0z = mesh.vertices[i0 * 3 + 2]!;
    const v1x = mesh.vertices[i1 * 3]!;
    const v1y = mesh.vertices[i1 * 3 + 1]!;
    const v1z = mesh.vertices[i1 * 3 + 2]!;
    const v2x = mesh.vertices[i2 * 3]!;
    const v2y = mesh.vertices[i2 * 3 + 1]!;
    const v2z = mesh.vertices[i2 * 3 + 2]!;

    // Compute face normal from cross product if normals not available
    const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
    const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-10) { nx /= len; ny /= len; nz /= len; }

    // Normal
    view.setFloat32(offset, nx, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, ny, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, nz, true); offset += STL_FLOAT_SIZE;

    // Vertex 0
    view.setFloat32(offset, v0x, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, v0y, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, v0z, true); offset += STL_FLOAT_SIZE;

    // Vertex 1
    view.setFloat32(offset, v1x, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, v1y, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, v1z, true); offset += STL_FLOAT_SIZE;

    // Vertex 2
    view.setFloat32(offset, v2x, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, v2y, true); offset += STL_FLOAT_SIZE;
    view.setFloat32(offset, v2z, true); offset += STL_FLOAT_SIZE;

    // Attribute byte count (unused)
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

export function exportSTLString(meshes: MeshData[]): string {
  let stl = 'solid OpenCAD\n';

  for (const mesh of meshes) {
    const triangleCount = Math.floor(mesh.indices.length / 3);

    for (let i = 0; i < triangleCount; i++) {
      const i0 = mesh.indices[i * 3]!;
      const i1 = mesh.indices[i * 3 + 1]!;
      const i2 = mesh.indices[i * 3 + 2]!;

      const v0x = mesh.vertices[i0 * 3]!;
      const v0y = mesh.vertices[i0 * 3 + 1]!;
      const v0z = mesh.vertices[i0 * 3 + 2]!;
      const v1x = mesh.vertices[i1 * 3]!;
      const v1y = mesh.vertices[i1 * 3 + 1]!;
      const v1z = mesh.vertices[i1 * 3 + 2]!;
      const v2x = mesh.vertices[i2 * 3]!;
      const v2y = mesh.vertices[i2 * 3 + 1]!;
      const v2z = mesh.vertices[i2 * 3 + 2]!;

      // Face normal
      const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
      const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 1e-10) { nx /= len; ny /= len; nz /= len; }

      stl += `  facet normal ${nx} ${ny} ${nz}\n`;
      stl += `    outer loop\n`;
      stl += `      vertex ${v0x} ${v0y} ${v0z}\n`;
      stl += `      vertex ${v1x} ${v1y} ${v1z}\n`;
      stl += `      vertex ${v2x} ${v2y} ${v2z}\n`;
      stl += `    endloop\n`;
      stl += `  endfacet\n`;
    }
  }

  stl += 'endsolid OpenCAD\n';
  return stl;
}
