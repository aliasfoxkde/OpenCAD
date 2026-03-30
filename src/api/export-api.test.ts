import { describe, it, expect } from 'vitest';
import { exportToFormat, serializeToOCAD, deserializeFromOCAD } from './export-api';
import type { MeshData } from '../types/cad';

const makeMesh = (overrides: Partial<MeshData> = {}): MeshData => ({
  vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
  featureId: 'test-mesh',
  ...overrides,
});

describe('export-api', () => {
  describe('exportToFormat', () => {
    it('should export STL format', () => {
      const mesh = makeMesh();
      const result = exportToFormat({ format: 'stl', meshes: [mesh] });
      expect(result.filename).toBe('model.stl');
      expect(result.mimeType).toBe('application/octet-stream');
      expect(result.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should export OBJ format', () => {
      const mesh = makeMesh();
      const result = exportToFormat({ format: 'obj', meshes: [mesh] });
      expect(result.filename).toBe('model.obj');
      expect(result.mimeType).toBe('text/plain');
      expect(typeof result.data).toBe('string');
    });

    it('should export GLB format', () => {
      const mesh = makeMesh();
      const result = exportToFormat({ format: 'glb', meshes: [mesh] });
      expect(result.filename).toBe('model.glb');
      expect(result.mimeType).toBe('model/gltf-binary');
      expect(result.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should export OCAD project format', () => {
      const result = exportToFormat({
        format: 'ocad',
        project: {
          name: 'Test Project',
          units: 'mm',
          features: [],
          sketches: [],
        },
      });
      expect(result.filename).toBe('Test Project.ocad');
      expect(result.mimeType).toBe('application/json');
      expect(typeof result.data).toBe('string');
      const parsed = JSON.parse(result.data as string);
      expect(parsed.name).toBe('Test Project');
      expect(parsed.units).toBe('mm');
    });

    it('should use custom filename when provided', () => {
      const mesh = makeMesh();
      const result = exportToFormat({ format: 'stl', meshes: [mesh], filename: 'custom.stl' });
      expect(result.filename).toBe('custom.stl');
    });

    it('should throw for STL with no meshes', () => {
      expect(() => exportToFormat({ format: 'stl', meshes: [] })).toThrow('No meshes provided');
    });

    it('should throw for OBJ with no meshes', () => {
      expect(() => exportToFormat({ format: 'obj', meshes: [] })).toThrow('No meshes provided');
    });

    it('should throw for GLB with no meshes', () => {
      expect(() => exportToFormat({ format: 'glb', meshes: [] })).toThrow('No meshes provided');
    });

    it('should throw for OCAD with no project data', () => {
      expect(() => exportToFormat({ format: 'ocad' })).toThrow('No project data provided');
    });

    it('should throw for unsupported format', () => {
      // @ts-expect-error intentional invalid format
      expect(() => exportToFormat({ format: 'xyz' })).toThrow('Unsupported export format');
    });
  });

  describe('serializeToOCAD', () => {
    it('should serialize project to JSON string', () => {
      const json = serializeToOCAD({
        name: 'My Part',
        units: 'mm',
        features: [],
        sketches: [],
      });
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('My Part');
    });
  });

  describe('deserializeFromOCAD', () => {
    it('should deserialize JSON string to project', () => {
      const project = {
        version: 1,
        name: 'Test',
        units: 'cm',
        features: [],
        sketches: [],
      };
      const json = JSON.stringify(project);
      const result = deserializeFromOCAD(json);
      expect(result.name).toBe('Test');
      expect(result.units).toBe('cm');
    });
  });
});
