/**
 * Converts feature parameters to MeshData for export.
 *
 * Uses the same generators as CADModel but returns MeshData
 * instead of Three.js geometries.
 */

import type { MeshData, FeatureNode } from '../types/cad';
import {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateConeMesh,
  generateTorusMesh,
  generateHoleMesh,
} from '../cad/kernel/mesh-generators';

/** Transform mesh vertices by a 4x4 matrix (3x4: row-major, translation in column 3) */
function transformMesh(mesh: MeshData, matrix: number[]): MeshData {
  const m = matrix;
  const vertices = new Float32Array(mesh.vertices.length);
  const normals = new Float32Array(mesh.normals.length);

  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = mesh.vertices[i]!;
    const y = mesh.vertices[i + 1]!;
    const z = mesh.vertices[i + 2]!;
    vertices[i] = m[0]! * x + m[1]! * y + m[2]! * z + m[3]!;
    vertices[i + 1] = m[4]! * x + m[5]! * y + m[6]! * z + m[7]!;
    vertices[i + 2] = m[8]! * x + m[9]! * y + m[10]! * z + m[11]!;
  }

  for (let i = 0; i < mesh.normals.length; i += 3) {
    const nx = mesh.normals[i]!;
    const ny = mesh.normals[i + 1]!;
    const nz = mesh.normals[i + 2]!;
    normals[i] = m[0]! * nx + m[1]! * ny + m[2]! * nz;
    normals[i + 1] = m[4]! * nx + m[5]! * ny + m[6]! * nz;
    normals[i + 2] = m[8]! * nx + m[9]! * ny + m[10]! * nz;
  }

  return {
    vertices,
    normals,
    indices: new Uint32Array(mesh.indices),
    featureId: mesh.featureId,
  };
}

/** Build translation matrix for linear pattern instance */
function translationMatrix(dx: number, dy: number, dz: number): number[] {
  return [1, 0, 0, dx, 0, 1, 0, dy, 0, 0, 1, dz];
}

/** Build rotation matrix around an axis */
function rotationMatrix(axis: 'x' | 'y' | 'z', angle: number): number[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  switch (axis) {
    case 'x': return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0];
    case 'y': return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0];
    case 'z': return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0];
  }
}

/** Convert a single feature to MeshData, or null if unsupported */
export function featureToMesh(feature: FeatureNode, allFeatures?: FeatureNode[]): MeshData | null {
  switch (feature.type) {
    case 'extrude': {
      const width = (feature.parameters.width as number) ?? 1;
      const height = (feature.parameters.height as number) ?? 1;
      const depth = (feature.parameters.depth as number) ?? 1;
      const mesh = generateBoxMesh(width, height, depth);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'revolve': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const height = (feature.parameters.height as number) ?? 1;
      const mesh = generateCylinderMesh(radius, height);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'sphere': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const mesh = generateSphereMesh(radius);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'cone': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const height = (feature.parameters.height as number) ?? 1;
      const mesh = generateConeMesh(radius, height);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'torus': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const tube = Math.max(0.001, (feature.parameters.tube as number) ?? 0.15);
      const mesh = generateTorusMesh(radius, tube);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'hole': {
      const diameter = Math.max(0.001, (feature.parameters.diameter as number) ?? 5);
      const depth = Math.max(0.001, (feature.parameters.depth as number) ?? 10);
      const mesh = generateHoleMesh(diameter, depth);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'pattern_linear': {
      if (!allFeatures) return null;
      const refId = feature.parameters.featureRef as string;
      const refFeature = allFeatures.find((f) => f.id === refId);
      if (!refFeature || refFeature.suppressed) return null;

      const baseMesh = featureToMesh(refFeature);
      if (!baseMesh) return null;

      const direction = (feature.parameters.direction as string) ?? 'x';
      const count = Math.max(1, Math.round((feature.parameters.count as number) ?? 3));
      const spacing = (feature.parameters.spacing as number) ?? 5;

      // Combine all instance meshes into one
      const allVerts: number[] = [];
      const allNormals: number[] = [];
      const allIndices: number[] = [];
      let vertexOffset = 0;

      for (let i = 0; i < count; i++) {
        const dx = direction === 'x' ? i * spacing : 0;
        const dy = direction === 'y' ? i * spacing : 0;
        const dz = direction === 'z' ? i * spacing : 0;
        const m = translationMatrix(dx, dy, dz);
        const transformed = transformMesh(baseMesh, m);

        for (let v = 0; v < transformed.vertices.length; v++) allVerts.push(transformed.vertices[v]!);
        for (let n = 0; n < transformed.normals.length; n++) allNormals.push(transformed.normals[n]!);
        for (let idx = 0; idx < transformed.indices.length; idx++) {
          allIndices.push((transformed.indices[idx] as number) + vertexOffset / 3);
        }
        vertexOffset += transformed.vertices.length;
      }

      return {
        vertices: new Float32Array(allVerts),
        normals: new Float32Array(allNormals),
        indices: new Uint32Array(allIndices),
        featureId: feature.id,
      };
    }
    case 'pattern_circular': {
      if (!allFeatures) return null;
      const refId = feature.parameters.featureRef as string;
      const refFeature = allFeatures.find((f) => f.id === refId);
      if (!refFeature || refFeature.suppressed) return null;

      const baseMesh = featureToMesh(refFeature);
      if (!baseMesh) return null;

      const axis = ((feature.parameters.axis as string) ?? 'z') as 'x' | 'y' | 'z';
      const count = Math.max(1, Math.round((feature.parameters.count as number) ?? 6));
      const totalAngle = ((feature.parameters.angle as number) ?? 360) * (Math.PI / 180);

      const allVerts: number[] = [];
      const allNormals: number[] = [];
      const allIndices: number[] = [];
      let vertexOffset = 0;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * totalAngle;
        const m = rotationMatrix(axis, angle);
        const transformed = transformMesh(baseMesh, m);

        for (let v = 0; v < transformed.vertices.length; v++) allVerts.push(transformed.vertices[v]!);
        for (let n = 0; n < transformed.normals.length; n++) allNormals.push(transformed.normals[n]!);
        for (let idx = 0; idx < transformed.indices.length; idx++) {
          allIndices.push((transformed.indices[idx] as number) + vertexOffset / 3);
        }
        vertexOffset += transformed.vertices.length;
      }

      return {
        vertices: new Float32Array(allVerts),
        normals: new Float32Array(allNormals),
        indices: new Uint32Array(allIndices),
        featureId: feature.id,
      };
    }
    default:
      return null;
  }
}

/** Convert all (non-suppressed) features to MeshData array */
export function featuresToMeshes(features: FeatureNode[]): MeshData[] {
  return features
    .filter((f) => !f.suppressed)
    .map((f) => featureToMesh(f, features))
    .filter((m): m is MeshData => m !== null);
}
