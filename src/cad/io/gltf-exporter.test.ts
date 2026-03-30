import { describe, it, expect } from 'vitest';
import { exportGLB } from './gltf-exporter';
import type { MeshData } from '../../types/cad';

function makeTriangle(): MeshData {
  return {
    featureId: 'tri',
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
  };
}

function makeSecondMesh(): MeshData {
  return {
    featureId: 'box',
    vertices: new Float32Array([2, 0, 0, 3, 0, 0, 2, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
  };
}

describe('GLB Exporter', () => {
  it('should have correct GLB magic and version', () => {
    const glb = exportGLB([makeTriangle()]);
    const view = new DataView(glb);
    expect(view.getUint32(0, true)).toBe(0x46546c67); // 'glTF'
    expect(view.getUint32(4, true)).toBe(2);
  });

  it('should have correct total length in header', () => {
    const glb = exportGLB([makeTriangle()]);
    const view = new DataView(glb);
    expect(view.getUint32(8, true)).toBe(glb.byteLength);
  });

  it('should contain valid JSON chunk', () => {
    const glb = exportGLB([makeTriangle()]);
    const view = new DataView(glb);
    const jsonLength = view.getUint32(12, true);
    const jsonType = view.getUint32(16, true);
    expect(jsonType).toBe(0x4e4f534a); // 'JSON'

    const bytes = new Uint8Array(glb, 20, jsonLength);
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.asset.version).toBe('2.0');
    expect(parsed.asset.generator).toBe('OpenCAD');
  });

  it('should contain mesh with correct name', () => {
    const glb = exportGLB([makeTriangle()]);
    const view = new DataView(glb);
    const jsonLength = view.getUint32(12, true);
    const bytes = new Uint8Array(glb, 20, jsonLength);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.meshes).toHaveLength(1);
    expect(parsed.meshes[0].name).toBe('tri');
  });

  it('should contain BIN chunk after JSON chunk', () => {
    const glb = exportGLB([makeTriangle()]);
    const view = new DataView(glb);
    const jsonLength = view.getUint32(12, true);
    // BIN chunk starts at 12 + 8 + jsonLength
    const binChunkOffset = 12 + 8 + jsonLength;
    const binType = view.getUint32(binChunkOffset + 4, true);
    expect(binType).toBe(0x004e4942); // 'BIN\0'
  });

  it('should handle multiple meshes', () => {
    const glb = exportGLB([makeTriangle(), makeSecondMesh()]);
    const view = new DataView(glb);
    const jsonLength = view.getUint32(12, true);
    const bytes = new Uint8Array(glb, 20, jsonLength);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.meshes).toHaveLength(2);
    expect(parsed.meshes[0].name).toBe('tri');
    expect(parsed.meshes[1].name).toBe('box');
  });

  it('should use custom scene name', () => {
    const glb = exportGLB([makeTriangle()], 'TestScene');
    const view = new DataView(glb);
    const jsonLength = view.getUint32(12, true);
    const bytes = new Uint8Array(glb, 20, jsonLength);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed.scenes[0].name).toBe('TestScene');
  });

  it('should include position accessor with min/max', () => {
    const glb = exportGLB([makeTriangle()]);
    const view = new DataView(glb);
    const jsonLength = view.getUint32(12, true);
    const bytes = new Uint8Array(glb, 20, jsonLength);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    const posAccessor = parsed.accessors[0];
    expect(posAccessor.type).toBe('VEC3');
    expect(posAccessor.componentType).toBe(5126); // FLOAT
    expect(posAccessor.count).toBe(3);
    expect(posAccessor.min).toEqual([0, 0, 0]);
    expect(posAccessor.max).toEqual([1, 1, 0]);
  });
});
