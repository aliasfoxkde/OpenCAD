import { describe, it, expect } from 'vitest';
import { exportSTL, exportSTLString } from './stl-exporter';
import type { MeshData } from '../../types/cad';

function makeTriangle(): MeshData {
  return {
    featureId: 'test',
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
  };
}

function makeBox(): MeshData {
  // Two triangles forming a quad (front face of a unit box)
  return {
    featureId: 'box',
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
  };
}

describe('STL Exporter', () => {
  describe('exportSTL (binary)', () => {
    it('should produce correct buffer size for one triangle', () => {
      const mesh = makeTriangle();
      const buffer = exportSTL(mesh);
      // 80 header + 4 count + 50 per triangle
      expect(buffer.byteLength).toBe(80 + 4 + 50);
    });

    it('should write correct triangle count', () => {
      const mesh = makeBox();
      const view = new DataView(exportSTL(mesh));
      expect(view.getUint32(80, true)).toBe(2);
    });

    it('should contain the header string', () => {
      const mesh = makeTriangle();
      const bytes = new Uint8Array(exportSTL(mesh));
      const header = new TextDecoder().decode(bytes.slice(0, 18));
      expect(header).toBe('OpenCAD STL Export');
    });

    it('should write vertex data at correct offsets', () => {
      const mesh = makeTriangle();
      const view = new DataView(exportSTL(mesh));
      // First triangle starts at offset 84
      // Normal: 84-95, V0: 96-107, V1: 108-119, V2: 120-131
      const v0x = view.getFloat32(96, true);
      const v0y = view.getFloat32(100, true);
      const v0z = view.getFloat32(104, true);
      expect(v0x).toBe(0);
      expect(v0y).toBe(0);
      expect(v0z).toBe(0);

      const v1x = view.getFloat32(108, true);
      expect(v1x).toBe(1);
    });

    it('should handle empty mesh (no triangles)', () => {
      const mesh: MeshData = {
        featureId: 'empty',
        vertices: new Float32Array([]),
        normals: new Float32Array([]),
        indices: new Uint32Array([]),
      };
      const buffer = exportSTL(mesh);
      expect(buffer.byteLength).toBe(84); // header + count only
      const view = new DataView(buffer);
      expect(view.getUint32(80, true)).toBe(0);
    });
  });

  describe('exportSTLString (ASCII)', () => {
    it('should produce valid ASCII STL', () => {
      const mesh = makeTriangle();
      const stl = exportSTLString([mesh]);
      expect(stl).toContain('solid OpenCAD');
      expect(stl).toContain('endsolid OpenCAD');
      expect(stl).toContain('facet normal');
      expect(stl).toContain('vertex 0 0 0');
      expect(stl).toContain('vertex 1 0 0');
      expect(stl).toContain('vertex 0 1 0');
      expect(stl).toContain('endfacet');
    });

    it('should handle multiple meshes', () => {
      const mesh1 = makeTriangle();
      const mesh2: MeshData = {
        featureId: 'box',
        vertices: new Float32Array([2, 0, 0, 3, 0, 0, 2, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      };
      const stl = exportSTLString([mesh1, mesh2]);
      // 2 facets total
      const facetCount = (stl.match(/facet normal/g) || []).length;
      expect(facetCount).toBe(2);
    });

    it('should handle empty mesh list', () => {
      const stl = exportSTLString([]);
      expect(stl).toBe('solid OpenCAD\nendsolid OpenCAD\n');
    });
  });
});
