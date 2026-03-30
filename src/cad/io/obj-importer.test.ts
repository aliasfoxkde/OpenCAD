import { describe, it, expect } from 'vitest';
import { importOBJ } from './obj-importer';

describe('importOBJ', () => {
  it('parses vertices and faces with normals', () => {
    const obj = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'vn 0 0 1', 'f 1//1 2//1 3//1'].join('\n');

    const result = importOBJ(obj, 'test');
    expect(result.name).toBe('test');
    expect(result.mesh.vertices.length).toBe(9);
    expect(result.mesh.normals.length).toBe(9);
    expect(result.mesh.indices.length).toBe(3);
  });

  it('handles faces with v/vt/vn format', () => {
    const obj = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'vt 0 0', 'vt 1 0', 'vt 0 1', 'vn 0 0 1', 'f 1/1/1 2/2/1 3/3/1'].join(
      '\n',
    );

    const result = importOBJ(obj);
    expect(result.mesh.vertices.length).toBe(9);
    expect(result.mesh.indices.length).toBe(3);
  });

  it('uses default normal when none provided', () => {
    const obj = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'f 1 2 3'].join('\n');

    const result = importOBJ(obj);
    expect(result.mesh.vertices.length).toBe(9);
    expect(result.mesh.normals.length).toBe(9);
    // Default normal is (0, 1, 0)
    expect(result.mesh.normals[0]).toBe(0);
    expect(result.mesh.normals[1]).toBe(1);
    expect(result.mesh.normals[2]).toBe(0);
  });

  it('deduplicates shared vertex/normal combos', () => {
    // Two triangles sharing an edge with the same normal
    const obj = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'v 1 1 0', 'vn 0 0 1', 'f 1//1 2//1 3//1', 'f 2//1 4//1 3//1'].join(
      '\n',
    );

    const result = importOBJ(obj);
    // Vertex 2 and 3 are shared, so we should have 4 unique verts, not 6
    expect(result.mesh.vertices.length).toBe(12); // 4 vertices × 3
    expect(result.mesh.indices.length).toBe(6); // 2 triangles × 3
  });

  it('triangulates n-gon faces (fan triangulation)', () => {
    // Quad face with 4 vertices
    const obj = ['v 0 0 0', 'v 1 0 0', 'v 1 1 0', 'v 0 1 0', 'vn 0 0 1', 'f 1//1 2//1 3//1 4//1'].join('\n');

    const result = importOBJ(obj);
    // Quad should produce 2 triangles
    expect(result.mesh.indices.length).toBe(6);
    // Indices should form 2 triangles from fan: (0,1,2) and (0,2,3)
    expect(result.mesh.indices[0]).toBe(0);
    expect(result.mesh.indices[1]).toBe(1);
    expect(result.mesh.indices[2]).toBe(2);
    expect(result.mesh.indices[3]).toBe(0);
    expect(result.mesh.indices[4]).toBe(2);
    expect(result.mesh.indices[5]).toBe(3);
  });

  it('handles different normals for same vertex', () => {
    // Flat shading: same position but different normals
    const obj = [
      'v 0 0 0',
      'v 1 0 0',
      'v 0.5 1 0',
      'vn 0 0 1',
      'vn 0 0 -1',
      'f 1//1 2//1 3//1',
      'f 3//2 2//2 1//2',
    ].join('\n');

    const result = importOBJ(obj);
    // Different normals means different vertices — no dedup
    expect(result.mesh.vertices.length).toBe(18); // 6 unique verts × 3
    expect(result.mesh.indices.length).toBe(6);
  });

  it('ignores empty and comment lines', () => {
    const obj = ['# This is a comment', '', '  ', 'v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'vn 0 0 1', 'f 1//1 2//1 3//1'].join(
      '\n',
    );

    const result = importOBJ(obj);
    expect(result.mesh.vertices.length).toBe(9);
    expect(result.mesh.indices.length).toBe(3);
  });

  it('handles faces with v/vt format (no normal)', () => {
    const obj = ['v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'vt 0 0', 'vt 1 0', 'vt 0 1', 'f 1/1 2/2 3/3'].join('\n');

    const result = importOBJ(obj);
    expect(result.mesh.vertices.length).toBe(9);
    // Default normal applied
    expect(result.mesh.normals[1]).toBe(1);
  });
});
