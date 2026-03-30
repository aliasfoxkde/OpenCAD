import { describe, it, expect } from 'vitest';
import { export3MF } from './3mf-exporter';
import type { MeshData } from '../../types/cad';

function createTriangleMesh(): MeshData {
  return {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    featureId: 'test-tri',
  };
}

function createUnitCubeMesh(): MeshData {
  const hw = 0.5;
  const vertices = new Float32Array([
    -hw, -hw, -hw, hw, -hw, -hw, hw, hw, -hw, -hw, hw, -hw, -hw, hw, hw, hw, -hw, hw, hw, hw, hw, -hw, hw, hw, hw,
  ]);
  const normals = new Float32Array(24);
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
  ]);
  return { vertices, normals, indices, featureId: 'cube' };
}

describe('3MF Exporter', () => {
  it('should produce valid XML with xml declaration', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).toMatch(/^<\?xml/);
  });

  it('should include 3MF namespace', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).toContain('3dmanufacturing/core/2015/02');
  });

  it('should include unit attribute', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).toContain('unit="millimeter"');
  });

  it('should include vertex coordinates', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).toContain('x="0.000000" y="0.000000" z="0.000000"');
    expect(xml).toContain('x="1.000000" y="0.000000" z="0.000000"');
  });

  it('should include triangle indices', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).toContain('v1="0" v2="1" v3="2"');
  });

  it('should include build item referencing first mesh', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).toContain('objectid="test-tri"');
  });

  it('should handle multiple meshes', () => {
    const tri = createTriangleMesh();
    const cube = createUnitCubeMesh();
    const xml = export3MF([tri, cube]);
    expect(xml).toContain('test-tri');
    expect(xml).toContain('cube');
  });

  it('should handle meshes without featureId', () => {
    const mesh: MeshData = {
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      normals: new Float32Array(9),
      indices: new Uint32Array([0, 1, 2]),
      featureId: '',
    };
    const xml = export3MF([mesh]);
    expect(xml).toContain('mesh_0');
  });

  it('should include all vertices', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    // 3 vertices for a triangle
    const vertexMatches = xml.match(/<vertex /g);
    expect(vertexMatches).toHaveLength(3);
  });

  it('should include triangle count', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).toContain('count="1"');
  });

  it('should use default namespace (no m: prefix)', () => {
    const mesh = createTriangleMesh();
    const xml = export3MF([mesh]);
    expect(xml).not.toContain('m:vertex');
    expect(xml).not.toContain('m:triangle');
    expect(xml).toContain('<vertex');
    expect(xml).toContain('<triangle');
  });
});
