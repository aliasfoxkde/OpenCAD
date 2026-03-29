/**
 * Wavefront OBJ Importer — parses OBJ text files into mesh data.
 *
 * Supports: v, vn, f (with v, v/vt, v/vt/vn, v//vn formats)
 */

import type { ImportResult } from './stl-importer';

export function importOBJ(text: string, name = 'imported'): ImportResult {
  const positions: number[] = [];
  const normalData: number[] = [];
  const outVertices: number[] = [];
  const outNormals: number[] = [];
  const outIndices: number[] = [];

  // Track unique vertex+normal combos for deduplication
  const vertexMap = new Map<string, number>();
  let nextIndex = 0;

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/);
      positions.push(
        parseFloat(parts[1] ?? '0'),
        parseFloat(parts[2] ?? '0'),
        parseFloat(parts[3] ?? '0'),
      );
    } else if (trimmed.startsWith('vn ')) {
      const parts = trimmed.split(/\s+/);
      normalData.push(
        parseFloat(parts[1] ?? '0'),
        parseFloat(parts[2] ?? '0'),
        parseFloat(parts[3] ?? '0'),
      );
    } else if (trimmed.startsWith('f ')) {
      const parts = trimmed.split(/\s+/).slice(1);
      const faceIndices: number[] = [];

      for (const part of parts) {
        // Parse v, v/vt, v/vt/vn, or v//vn
        const components = part.split('/');
        const vi = parseInt(components[0] ?? '1', 10) - 1; // OBJ is 1-based
        // const ti = components[1] ? parseInt(components[1], 10) - 1 : -1; // texture (unused)
        const ni = components[2] ? parseInt(components[2], 10) - 1 : -1;

        const key = `${vi}/${ni}`;
        let idx = vertexMap.get(key);
        if (idx === undefined) {
          idx = nextIndex++;
          vertexMap.set(key, idx);

          outVertices.push(
            positions[vi * 3] ?? 0,
            positions[vi * 3 + 1] ?? 0,
            positions[vi * 3 + 2] ?? 0,
          );

          if (ni >= 0) {
            outNormals.push(
              normalData[ni * 3] ?? 0,
              normalData[ni * 3 + 1] ?? 0,
              normalData[ni * 3 + 2] ?? 0,
            );
          } else {
            // Default normal
            outNormals.push(0, 1, 0);
          }
        }

        faceIndices.push(idx);
      }

      // Triangulate face (fan triangulation for n-gons)
      if (faceIndices.length >= 3) {
        for (let i = 2; i < faceIndices.length; i++) {
          outIndices.push(faceIndices[0]!);
          outIndices.push(faceIndices[i - 1]!);
          outIndices.push(faceIndices[i]!);
        }
      }
    }
  }

  return {
    mesh: {
      vertices: new Float32Array(outVertices),
      normals: new Float32Array(outNormals),
      indices: new Uint32Array(outIndices),
      featureId: '',
    },
    name,
  };
}
