import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenCADAPI } from './opencad-api';
import type { FeatureNode } from '@/types/cad';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-123',
}));

// Mock db module
vi.mock('@/cad/io/db', () => ({
  saveDocument: vi.fn().mockResolvedValue(undefined),
  loadDocument: vi.fn().mockResolvedValue({
    id: 'doc-1',
    name: 'Test',
    units: 'mm',
    features: [],
    created: Date.now(),
    modified: Date.now(),
    autoSave: false,
  }),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  listDocuments: vi.fn().mockResolvedValue([
    { id: 'doc-1', name: 'Test', created: 1, modified: 2, featureCount: 3 },
  ]),
  createDocumentId: vi.fn(() => 'generated-id'),
  createNewDocument: vi.fn(() => ({
    id: 'new-doc',
    name: 'Untitled',
    units: 'mm',
    features: [],
    created: Date.now(),
    modified: Date.now(),
    autoSave: false,
  })),
  closeDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock cad-store
const mockFeatures: FeatureNode[] = [
  {
    id: 'f1',
    type: 'extrude',
    name: 'Box1',
    parameters: { width: 10, height: 20, depth: 30 },
    dependencies: [],
    children: ['f2'],
    suppressed: false,
  },
  {
    id: 'f2',
    type: 'sphere',
    name: 'Sphere1',
    parameters: { radius: 5 },
    dependencies: ['f1'],
    children: [],
    suppressed: true,
  },
];

const mockStoreState = {
  features: mockFeatures,
  addFeature: vi.fn(),
  removeFeature: vi.fn(),
  updateFeature: vi.fn(),
};

vi.mock('@/stores/cad-store', () => ({
  useCADStore: {
    getState: () => mockStoreState,
  },
}));

// Mock feature-registry
vi.mock('@/cad/features/feature-registry', () => ({
  getFeatureDefinition: vi.fn((type: string) => ({
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: 'cube',
    category: 'primitives',
    parameters: [],
    description: `A ${type}`,
  })),
  getAllFeatureDefinitions: vi.fn(() => [
    {
      type: 'box',
      label: 'Box',
      icon: 'cube',
      category: 'primitives',
      parameters: [],
      description: 'A box',
    },
    {
      type: 'sphere',
      label: 'Sphere',
      icon: 'circle',
      category: 'primitives',
      parameters: [],
      description: 'A sphere',
    },
  ]),
  getDefaultParameters: vi.fn((type: string) => {
    if (type === 'box') return { width: 10, height: 10, depth: 10 };
    if (type === 'sphere') return { radius: 5 };
    return {};
  }),
}));

// Mock measure module
vi.mock('@/cad/analysis/measure', () => ({
  distance3D: vi.fn(() => 14.14),
  angleBetween: vi.fn(() => 0.785),
  computeBounds: vi.fn(() => ({
    minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 20, maxZ: 30,
  })),
  computeCentroid: vi.fn(() => ({ x: 5, y: 10, z: 15 })),
  computeSurfaceArea: vi.fn(() => 1200),
  computeVolume: vi.fn(() => 6000),
  measureDistance: vi.fn(() => ({
    value: 14.14, unit: 'mm', label: 'Distance',
  })),
  measureAngle: vi.fn(() => ({
    value: 45, unit: 'deg', label: 'Angle',
  })),
  measureBoundingBox: vi.fn(() => ({
    bounds: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 20, maxZ: 30 },
    width: 10, height: 20, depth: 30,
  })),
  getMassProperties: vi.fn(() => ({
    centroid: { x: 5, y: 10, z: 15 },
    surfaceArea: 1200,
    volume: 6000,
    bounds: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 20, maxZ: 30 },
  })),
}));

// Mock exporters
vi.mock('@/cad/io/stl-exporter', () => ({
  exportSTL: vi.fn(() => new ArrayBuffer(100)),
}));

vi.mock('@/cad/io/obj-exporter', () => ({
  exportOBJ: vi.fn(() => ({ obj: '# OBJ file\nv 0 0 0\n' })),
}));

vi.mock('@/cad/io/gltf-exporter', () => ({
  exportGLB: vi.fn(() => new ArrayBuffer(200)),
}));

vi.mock('@/cad/io/stl-importer', () => ({
  importSTL: vi.fn(() => ({
    mesh: {
      vertices: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 1, 0]),
      indices: new Uint32Array([0]),
      featureId: 'imported',
    },
    name: 'imported',
  })),
}));

vi.mock('@/cad/io/obj-importer', () => ({
  importOBJ: vi.fn(() => ({
    mesh: {
      vertices: new Float32Array([1, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0]),
      featureId: 'imported',
    },
    name: 'imported',
  })),
}));

vi.mock('@/cad/io/project', () => ({
  serializeProject: vi.fn(() => '{"version":1}'),
  deserializeProject: vi.fn((_json: string) => ({
    version: 1,
    name: 'Test',
    created: 1,
    modified: 2,
    units: 'mm',
    features: [],
    sketches: [],
  })),
  downloadFile: vi.fn(),
  openFile: vi.fn(async () => ({
    name: 'file.stl',
    data: new ArrayBuffer(100),
  })),
}));

describe('OpenCADAPI', () => {
  let api: OpenCADAPI;

  beforeEach(() => {
    api = new OpenCADAPI();
    vi.clearAllMocks();
  });

  describe('version', () => {
    it('should have version string', () => {
      expect(api.version).toBe('1.0.0');
    });
  });

  describe('features', () => {
    it('should list all features', () => {
      const features = api.features.getAll();
      expect(features).toHaveLength(2);
      expect(features[0]?.id).toBe('f1');
    });

    it('should get a single feature by ID', () => {
      const feature = api.features.get('f1');
      expect(feature).toBeDefined();
      expect(feature!.name).toBe('Box1');
    });

    it('should return undefined for non-existent feature', () => {
      const feature = api.features.get('nonexistent');
      expect(feature).toBeUndefined();
    });

    it('should add a feature', () => {
      const result = api.features.add('extrude', 'MyBox', { width: 50 });
      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('extrude');
      expect(result.data!.name).toBe('MyBox');
      expect(mockStoreState.addFeature).toHaveBeenCalled();
    });

    it('should remove a feature', () => {
      const result = api.features.remove('f1');
      expect(result.success).toBe(true);
      expect(mockStoreState.removeFeature).toHaveBeenCalledWith('f1');
    });

    it('should modify a feature', () => {
      const result = api.features.modify('f1', { name: 'UpdatedBox' });
      expect(result.success).toBe(true);
      expect(mockStoreState.updateFeature).toHaveBeenCalled();
    });

    it('should fail to modify non-existent feature', () => {
      // Override getState to return features without the target
      mockStoreState.features = [mockFeatures[0]!];
      const result = api.features.modify('nonexistent', { name: 'X' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      mockStoreState.features = mockFeatures;
    });

    it('should get feature summaries', () => {
      const summaries = api.features.list();
      expect(summaries).toHaveLength(2);
      expect(summaries[0]).toEqual({
        id: 'f1',
        type: 'extrude',
        name: 'Box1',
        suppressed: false,
        parameterCount: 3,
        dependencyCount: 0,
        childCount: 1,
      });
    });

    it('should get feature details', () => {
      const result = api.features.getDetails('f1');
      expect(result.success).toBe(true);
      expect(result.data!.feature.id).toBe('f1');
      expect(result.data!.definition).toBeDefined();
    });

    it('should list available feature types', () => {
      const available = api.features.listAvailable();
      expect(available).toHaveLength(2);
      expect(available[0]?.type).toBe('box');
    });

    it('should get default parameters for a feature type', () => {
      const defaults = api.features.getDefaults('box');
      expect(defaults).toEqual({ width: 10, height: 10, depth: 10 });
    });
  });

  describe('measure', () => {
    const mockMesh = {
      vertices: new Float32Array(),
      normals: new Float32Array(),
      indices: new Uint32Array(),
      featureId: 'test',
    } as import('@/types/cad').MeshData;

    it('should measure distance', () => {
      const result = api.measure.distance({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 0 });
      expect(result.distance).toBe(14.14);
    });

    it('should measure angle', () => {
      const angle = api.measure.angle({ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 });
      expect(angle).toBe(0.785);
    });

    it('should compute bounds', () => {
      const result = api.measure.bounds(mockMesh);
      expect(result.width).toBe(10);
      expect(result.depth).toBe(30);
    });

    it('should compute mass properties', () => {
      const result = api.measure.massProperties(mockMesh);
      expect(result.volume).toBe(6000);
      expect(result.surfaceArea).toBe(1200);
    });

    it('should compute centroid', () => {
      const centroid = api.measure.centroid(mockMesh);
      expect(centroid).toEqual({ x: 5, y: 10, z: 15 });
    });

    it('should compute surface area', () => {
      const area = api.measure.surfaceArea(mockMesh);
      expect(area).toBe(1200);
    });

    it('should compute volume', () => {
      const vol = api.measure.volume(mockMesh);
      expect(vol).toBe(6000);
    });
  });

  describe('io', () => {
    it('should export to STL format', () => {
      const mockMesh = {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        featureId: 'test',
      } as import('@/types/cad').MeshData;

      const result = api.io.export({ format: 'stl', meshes: [mockMesh] });
      expect(result.filename).toBe('model.stl');
      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('should export to OBJ format', () => {
      const mockMesh = {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        featureId: 'test',
      } as import('@/types/cad').MeshData;

      const result = api.io.export({ format: 'obj', meshes: [mockMesh] });
      expect(result.filename).toBe('model.obj');
      expect(result.data).toContain('OBJ');
    });

    it('should export to GLB format', () => {
      const mockMesh = {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        featureId: 'test',
      } as import('@/types/cad').MeshData;

      const result = api.io.export({ format: 'glb', meshes: [mockMesh] });
      expect(result.filename).toBe('model.glb');
    });

    it('should export to .ocad format', () => {
      const result = api.io.export({
        format: 'ocad',
        project: {
          name: 'TestProject',
          units: 'mm',
          features: [],
          sketches: [],
        },
      });
      expect(result.filename).toBe('TestProject.ocad');
      expect(result.mimeType).toBe('application/json');
    });

    it('should throw for unsupported format', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => api.io.export({ format: 'xyz' as any })).toThrow('Unsupported export format');
    });

    it('should throw when no meshes provided for STL', () => {
      expect(() => api.io.export({ format: 'stl' })).toThrow('No meshes provided');
    });

    it('should serialize project', () => {
      const json = api.io.serialize({
        name: 'Test',
        units: 'mm',
        features: [],
        sketches: [],
      });
      expect(json).toBe('{"version":1}');
    });

    it('should deserialize project', () => {
      const project = api.io.deserialize('{"version":1}');
      expect(project.version).toBe(1);
    });
  });

  describe('documents', () => {
    it('should have all document methods', () => {
      expect(api.documents.create).toBeTypeOf('function');
      expect(api.documents.list).toBeTypeOf('function');
      expect(api.documents.open).toBeTypeOf('function');
      expect(api.documents.save).toBeTypeOf('function');
      expect(api.documents.delete).toBeTypeOf('function');
      expect(api.documents.generateId).toBeTypeOf('function');
      expect(api.documents.close).toBeTypeOf('function');
    });
  });
});
