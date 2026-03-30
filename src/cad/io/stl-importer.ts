/**
 * STL Binary Importer — parses binary STL files into mesh data.
 *
 * Also supports ASCII STL format detection and parsing.
 */

import type { MeshData } from '../../types/cad';

export interface ImportResult {
  mesh: MeshData;
  name: string;
}

export function importSTL(buffer: ArrayBuffer, name = 'imported'): ImportResult {
  const view = new DataView(buffer);

  // Check if ASCII STL (starts with "solid")
  const headerBytes = new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength));
  const headerStr = new TextDecoder().decode(headerBytes);
  if (headerStr.trimStart().startsWith('solid')) {
    // Could be ASCII — check for "facet" keyword to confirm
    const textContent = new TextDecoder().decode(buffer);
    if (textContent.includes('facet normal')) {
      return { mesh: parseASCII_STL(textContent), name };
    }
  }

  // Binary STL
  return { mesh: parseBinarySTL(view), name };
}

function parseBinarySTL(view: DataView): MeshData {
  const triangleCount = view.getUint32(80, true);
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  let offset = 84;

  for (let t = 0; t < triangleCount; t++) {
    // Normal
    const nx = view.getFloat32(offset, true);
    offset += 4;
    const ny = view.getFloat32(offset, true);
    offset += 4;
    const nz = view.getFloat32(offset, true);
    offset += 4;

    // 3 vertices
    for (let v = 0; v < 3; v++) {
      const x = view.getFloat32(offset, true);
      offset += 4;
      const y = view.getFloat32(offset, true);
      offset += 4;
      const z = view.getFloat32(offset, true);
      offset += 4;

      normals.push(nx, ny, nz);
      vertices.push(x, y, z);
      indices.push(t * 3 + v);
    }

    offset += 2; // attribute byte count
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    featureId: '',
  };
}

function parseASCII_STL(text: string): MeshData {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const lines = text.split('\n');
  let vertexIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    const normalMatch = trimmed.match(/^facet normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/);
    if (normalMatch) {
      const nx = parseFloat(normalMatch[1]!);
      const ny = parseFloat(normalMatch[2]!);
      const nz = parseFloat(normalMatch[3]!);

      // Read 3 vertices
      normals.push(nx, ny, nz);
      normals.push(nx, ny, nz);
      normals.push(nx, ny, nz);
    }

    const vertexMatch = trimmed.match(/^vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/);
    if (vertexMatch) {
      vertices.push(parseFloat(vertexMatch[1]!), parseFloat(vertexMatch[2]!), parseFloat(vertexMatch[3]!));
      indices.push(vertexIndex++);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    featureId: '',
  };
}
