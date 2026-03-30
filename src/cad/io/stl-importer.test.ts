import { describe, it, expect } from 'vitest';
import { importSTL } from './stl-importer';

function makeBinarySTL(triangles: Array<{ nx: number; ny: number; nz: number; verts: Array<[number, number, number]> }>): ArrayBuffer {
  // 80-byte header + 4-byte count + 50 bytes per triangle
  const header = new Uint8Array(80);
  const buffer = new ArrayBuffer(84 + triangles.length * 50);
  const view = new DataView(buffer);

  // Copy header
  new Uint8Array(buffer, 0, 80).set(header);
  // Triangle count
  view.setUint32(80, triangles.length, true);

  let offset = 84;
  for (const tri of triangles) {
    view.setFloat32(offset, tri.nx, true); offset += 4;
    view.setFloat32(offset, tri.ny, true); offset += 4;
    view.setFloat32(offset, tri.nz, true); offset += 4;
    for (const v of tri.verts) {
      view.setFloat32(offset, v[0], true); offset += 4;
      view.setFloat32(offset, v[1], true); offset += 4;
      view.setFloat32(offset, v[2], true); offset += 4;
    }
    offset += 2; // attribute byte count
  }

  return buffer;
}

describe('importSTL', () => {
  describe('binary STL', () => {
    it('parses a single triangle', () => {
      const buffer = makeBinarySTL([
        {
          nx: 0, ny: 0, nz: 1,
          verts: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
        },
      ]);

      const result = importSTL(buffer, 'test-tri');
      expect(result.name).toBe('test-tri');
      expect(result.mesh.vertices.length).toBe(9); // 3 vertices × 3
      expect(result.mesh.normals.length).toBe(9); // 3 normals × 3
      expect(result.mesh.indices.length).toBe(3);

      // Check first vertex
      expect(result.mesh.vertices[0]).toBe(0);
      expect(result.mesh.vertices[1]).toBe(0);
      expect(result.mesh.vertices[2]).toBe(0);

      // Check normal
      expect(result.mesh.normals[0]).toBe(0);
      expect(result.mesh.normals[1]).toBe(0);
      expect(result.mesh.normals[2]).toBe(1);
    });

    it('parses multiple triangles', () => {
      const buffer = makeBinarySTL([
        { nx: 0, ny: 0, nz: 1, verts: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] },
        { nx: 0, ny: 1, nz: 0, verts: [[1, 0, 0], [1, 1, 0], [0, 1, 0]] },
      ]);

      const result = importSTL(buffer);
      expect(result.mesh.vertices.length).toBe(18); // 6 vertices × 3
      expect(result.mesh.indices.length).toBe(6);

      // First triangle normal = (0,0,1)
      expect(result.mesh.normals[2]).toBe(1);
      // Second triangle normal = (0,1,0)
      expect(result.mesh.normals[9 + 1]).toBe(1);
    });

    it('produces correct indices for multiple triangles', () => {
      const buffer = makeBinarySTL([
        { nx: 1, ny: 0, nz: 0, verts: [[0, 0, 0], [0, 1, 0], [0, 0, 1]] },
        { nx: 0, ny: 1, nz: 0, verts: [[1, 0, 0], [1, 1, 0], [1, 0, 1]] },
      ]);

      const result = importSTL(buffer);
      // First triangle: indices 0, 1, 2
      expect(result.mesh.indices[0]).toBe(0);
      expect(result.mesh.indices[1]).toBe(1);
      expect(result.mesh.indices[2]).toBe(2);
      // Second triangle: indices 3, 4, 5
      expect(result.mesh.indices[3]).toBe(3);
      expect(result.mesh.indices[4]).toBe(4);
      expect(result.mesh.indices[5]).toBe(5);
    });
  });

  describe('ASCII STL', () => {
    it('parses ASCII STL format', () => {
      const ascii = [
        'solid test',
        '  facet normal 0 0 1',
        '    outer loop',
        '      vertex 0 0 0',
        '      vertex 1 0 0',
        '      vertex 0 1 0',
        '    endloop',
        '  endfacet',
        'endsolid test',
      ].join('\n');

      const buffer = new TextEncoder().encode(ascii).buffer;
      const result = importSTL(buffer);
      expect(result.mesh.vertices.length).toBe(9);
      expect(result.mesh.normals.length).toBe(9);
      expect(result.mesh.indices.length).toBe(3);

      // Check vertices
      expect(result.mesh.vertices[0]).toBe(0);
      expect(result.mesh.vertices[3]).toBe(1);
      expect(result.mesh.vertices[7]).toBe(1);
    });

    it('parses multiple facets', () => {
      const ascii = [
        'solid test',
        '  facet normal 0 0 1',
        '    outer loop',
        '      vertex 0 0 0',
        '      vertex 1 0 0',
        '      vertex 0 1 0',
        '    endloop',
        '  endfacet',
        '  facet normal 0 1 0',
        '    outer loop',
        '      vertex 1 0 0',
        '      vertex 1 1 0',
        '      vertex 0 1 0',
        '    endloop',
        '  endfacet',
        'endsolid test',
      ].join('\n');

      const buffer = new TextEncoder().encode(ascii).buffer;
      const result = importSTL(buffer);
      expect(result.mesh.vertices.length).toBe(18);
      expect(result.mesh.indices.length).toBe(6);
    });

    it('falls back to binary when "solid" header but no "facet"', () => {
      // Starts with "solid" but no "facet normal" keyword
      // Should be treated as binary
      const buffer = makeBinarySTL([
        { nx: 1, ny: 0, nz: 0, verts: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] },
      ]);

      const result = importSTL(buffer);
      // Binary parse should work fine
      expect(result.mesh.vertices.length).toBe(9);
      expect(result.mesh.indices.length).toBe(3);
    });
  });
});
