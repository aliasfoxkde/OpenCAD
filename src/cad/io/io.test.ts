import { describe, it, expect } from 'vitest';
import { exportSTL, exportSTLString } from './stl-exporter';
import { importSTL } from './stl-importer';
import { exportOBJ } from './obj-exporter';
import { importOBJ } from './obj-importer';
import { exportGLB } from './gltf-exporter';
import { serializeProject, deserializeProject } from './project';
import type { MeshData } from '../../types/cad';

function createTestMesh(): MeshData {
  // Simple triangle
  return {
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    featureId: 'test',
  };
}

function createBoxMesh(): MeshData {
  // Box with 8 vertices, 12 triangles
  const hw = 0.5;
  const vertices = new Float32Array([
    -hw,
    -hw,
    -hw,
    hw,
    -hw,
    -hw,
    hw,
    hw,
    -hw,
    -hw,
    hw,
    -hw,
    -hw,
    -hw,
    hw,
    hw,
    -hw,
    hw,
    hw,
    hw,
    hw,
    -hw,
    hw,
    hw,
  ]);
  const normals = new Float32Array([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
  ]);
  return { vertices, normals, indices, featureId: 'box' };
}

describe('STL Exporter', () => {
  it('should export binary STL with correct header', () => {
    const mesh = createTestMesh();
    const buffer = exportSTL(mesh);
    expect(buffer.byteLength).toBe(80 + 4 + 50); // header + count + 1 triangle
  });

  it('should write correct triangle count', () => {
    const mesh = createBoxMesh();
    const buffer = exportSTL(mesh);
    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    expect(triangleCount).toBe(12);
  });

  it('should export correct vertex positions', () => {
    const mesh = createTestMesh();
    const buffer = exportSTL(mesh);
    const view = new DataView(buffer);
    let offset = 84; // header + count

    // Skip normal (3 floats)
    offset += 12;

    // First vertex (0, 0, 0)
    expect(view.getFloat32(offset, true)).toBeCloseTo(0);
    offset += 4;
    expect(view.getFloat32(offset, true)).toBeCloseTo(0);
    offset += 4;
    expect(view.getFloat32(offset, true)).toBeCloseTo(0);
    offset += 4;

    // Second vertex (1, 0, 0)
    expect(view.getFloat32(offset, true)).toBeCloseTo(1);
    offset += 4;
    expect(view.getFloat32(offset, true)).toBeCloseTo(0);
    offset += 4;
    expect(view.getFloat32(offset, true)).toBeCloseTo(0);
  });

  it('should export ASCII STL string', () => {
    const mesh = createTestMesh();
    const stl = exportSTLString([mesh]);
    expect(stl).toContain('solid OpenCAD');
    expect(stl).toContain('endsolid OpenCAD');
    expect(stl).toContain('facet normal');
    expect(stl).toContain('vertex');
  });
});

describe('STL Importer', () => {
  it('should import binary STL roundtrip', () => {
    const original = createTestMesh();
    const buffer = exportSTL(original);
    const result = importSTL(buffer);

    expect(result.mesh.vertices.length).toBe(9); // 3 vertices × 3 components
    expect(result.mesh.indices.length).toBe(3);
    expect(result.name).toBe('imported');
  });

  it('should import ASCII STL', () => {
    const asciiSTL = `solid test
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid test`;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(asciiSTL).buffer;
    const result = importSTL(buffer, 'test-part');

    expect(result.mesh.vertices.length).toBe(9);
    expect(result.mesh.indices.length).toBe(3);
    expect(result.name).toBe('test-part');
  });

  it('should preserve vertex positions through roundtrip', () => {
    const mesh = createTestMesh();
    const buffer = exportSTL(mesh);
    const imported = importSTL(buffer);

    // First vertex
    expect(imported.mesh.vertices[0]).toBeCloseTo(0);
    expect(imported.mesh.vertices[1]).toBeCloseTo(0);
    expect(imported.mesh.vertices[2]).toBeCloseTo(0);
    // Second vertex
    expect(imported.mesh.vertices[3]).toBeCloseTo(1);
    expect(imported.mesh.vertices[4]).toBeCloseTo(0);
    expect(imported.mesh.vertices[5]).toBeCloseTo(0);
  });
});

describe('OBJ Exporter', () => {
  it('should export valid OBJ format', () => {
    const mesh = createTestMesh();
    const result = exportOBJ([mesh]);
    expect(result.obj).toContain('# OpenCAD OBJ Export');
    expect(result.obj).toContain('v 0 0 0');
    expect(result.obj).toContain('v 1 0 0');
    expect(result.obj).toContain('vn 0 0 1');
    expect(result.obj).toContain('f 1//1 2//2 3//3');
  });

  it('should export multiple meshes with correct indices', () => {
    const mesh1 = createTestMesh();
    const mesh2 = createTestMesh();
    const result = exportOBJ([mesh1, mesh2], 'MultiPart');

    // Second mesh faces should use offset indices (4//4, 5//5, 6//6)
    expect(result.obj).toContain('f 4//4 5//5 6//6');
  });

  it('should handle box mesh with 12 faces', () => {
    const box = createBoxMesh();
    const result = exportOBJ([box]);
    const faceLines = result.obj.split('\n').filter((l) => l.startsWith('f '));
    expect(faceLines).toHaveLength(12);
  });
});

describe('OBJ Importer', () => {
  it('should import basic OBJ with vertices and faces', () => {
    const objText = `# Test OBJ
v 0.0 0.0 0.0
v 1.0 0.0 0.0
v 0.0 1.0 0.0
vn 0.0 0.0 1.0
vn 0.0 0.0 1.0
vn 0.0 0.0 1.0
f 1//1 2//2 3//3
`;
    const result = importOBJ(objText, 'test');
    expect(result.mesh.vertices.length).toBe(9);
    expect(result.mesh.indices.length).toBe(3);
  });

  it('should handle v//vn face format', () => {
    const objText = `v 0 0 0
v 1 0 0
v 0 1 0
vn 0 0 1
f 1//1 2//1 3//1
`;
    const result = importOBJ(objText);
    expect(result.mesh.vertices.length).toBe(9);
    expect(result.mesh.normals.length).toBe(9);
  });

  it('should handle face format without normals', () => {
    const objText = `v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
`;
    const result = importOBJ(objText);
    expect(result.mesh.vertices.length).toBe(9);
    // Default normals should be (0, 1, 0)
    expect(result.mesh.normals[0]).toBe(0);
    expect(result.mesh.normals[1]).toBe(1);
    expect(result.mesh.normals[2]).toBe(0);
  });

  it('should triangulate quads', () => {
    const objText = `v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
f 1 2 3 4
`;
    const result = importOBJ(objText);
    // Quad → 2 triangles
    expect(result.mesh.indices.length).toBe(6);
  });

  it('should roundtrip OBJ export/import', () => {
    const original = createTestMesh();
    const exported = exportOBJ([original]);
    const imported = importOBJ(exported.obj);

    // Verify vertices match (allowing floating point tolerance)
    expect(imported.mesh.vertices[0]).toBeCloseTo(original.vertices[0]!);
    expect(imported.mesh.vertices[3]).toBeCloseTo(original.vertices[3]!);
    expect(imported.mesh.vertices[6]).toBeCloseTo(original.vertices[6]!);
  });
});

describe('glTF/GLB Exporter', () => {
  it('should produce valid GLB with correct magic', () => {
    const mesh = createTestMesh();
    const glb = exportGLB([mesh]);
    const view = new DataView(glb);

    expect(view.getUint32(0, true)).toBe(0x46546c67); // 'glTF' magic
    expect(view.getUint32(4, true)).toBe(2); // version
  });

  it('should produce GLB with correct total length', () => {
    const mesh = createTestMesh();
    const glb = exportGLB([mesh]);
    const view = new DataView(glb);
    const totalLength = view.getUint32(8, true);
    expect(totalLength).toBe(glb.byteLength);
  });

  it('should contain valid JSON chunk', () => {
    const mesh = createTestMesh();
    const glb = exportGLB([mesh]);
    const view = new DataView(glb);

    const jsonChunkLength = view.getUint32(12, true);
    const jsonChunkType = view.getUint32(16, true);
    expect(jsonChunkType).toBe(0x4e4f534a); // 'JSON'

    const jsonBytes = new Uint8Array(glb, 20, jsonChunkLength);
    const jsonStr = new TextDecoder().decode(jsonBytes);
    const gltf = JSON.parse(jsonStr);

    expect(gltf.asset.version).toBe('2.0');
    expect(gltf.asset.generator).toBe('OpenCAD');
    expect(gltf.meshes).toHaveLength(1);
    expect(gltf.accessors.length).toBeGreaterThanOrEqual(2);
  });

  it('should include position min/max in accessor', () => {
    const mesh = createTestMesh();
    const glb = exportGLB([mesh]);
    const view = new DataView(glb);

    const jsonChunkLength = view.getUint32(12, true);
    const jsonBytes = new Uint8Array(glb, 20, jsonChunkLength);
    const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));

    const posAccessor = gltf.accessors[0];
    expect(posAccessor.min).toBeDefined();
    expect(posAccessor.max).toBeDefined();
    expect(posAccessor.min).toHaveLength(3);
    expect(posAccessor.max).toHaveLength(3);
  });

  it('should export multiple meshes', () => {
    const mesh1 = createTestMesh();
    const mesh2 = createBoxMesh();
    const glb = exportGLB([mesh1, mesh2], 'MultiPart');

    const view = new DataView(glb);
    const jsonChunkLength = view.getUint32(12, true);
    const jsonBytes = new Uint8Array(glb, 20, jsonChunkLength);
    const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));

    expect(gltf.meshes).toHaveLength(2);
    expect(gltf.nodes).toHaveLength(2);
  });
});

describe('Project Save/Load', () => {
  it('should serialize a project to JSON', () => {
    const json = serializeProject({
      name: 'TestProject',
      units: 'mm',
      features: [],
      sketches: [],
    });
    const data = JSON.parse(json);
    expect(data.version).toBe(1);
    expect(data.name).toBe('TestProject');
    expect(data.units).toBe('mm');
  });

  it('should roundtrip serialize/deserialize', () => {
    const original = {
      name: 'RoundTrip',
      units: 'in' as const,
      features: [
        {
          id: 'f1',
          type: 'extrude' as const,
          name: 'Extrude 1',
          parameters: { depth: 10 },
          dependencies: [],
          children: [],
          suppressed: false,
        },
      ],
      sketches: [
        {
          id: 's1',
          plane: 'xy' as const,
          elements: [],
          constraints: [],
        },
      ],
    };

    const json = serializeProject(original);
    const loaded = deserializeProject(json);

    expect(loaded.name).toBe('RoundTrip');
    expect(loaded.units).toBe('in');
    expect(loaded.features).toHaveLength(1);
    expect(loaded.features[0]!.name).toBe('Extrude 1');
    expect(loaded.sketches).toHaveLength(1);
  });

  it('should reject unsupported version', () => {
    const badJson = JSON.stringify({ version: 999, name: 'bad' });
    expect(() => deserializeProject(badJson)).toThrow('Unsupported project version');
  });

  it('should default missing fields', () => {
    const minimal = JSON.stringify({ version: 1 });
    const loaded = deserializeProject(minimal);
    expect(loaded.name).toBe('Untitled');
    expect(loaded.units).toBe('mm');
    expect(loaded.features).toEqual([]);
    expect(loaded.sketches).toEqual([]);
  });

  it('should update modified timestamp on load', () => {
    const json = serializeProject({
      name: 'TimestampTest',
      units: 'mm',
      features: [],
      sketches: [],
    });
    const before = Date.now();
    const loaded = deserializeProject(json);
    const after = Date.now();
    expect(loaded.modified).toBeGreaterThanOrEqual(before);
    expect(loaded.modified).toBeLessThanOrEqual(after);
  });
});
