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
} from '../cad/kernel/mesh-generators';

/** Convert a single feature to MeshData, or null if unsupported */
export function featureToMesh(feature: FeatureNode): MeshData | null {
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
    default:
      return null;
  }
}

/** Convert all (non-suppressed) features to MeshData array */
export function featuresToMeshes(features: FeatureNode[]): MeshData[] {
  return features
    .filter((f) => !f.suppressed)
    .map((f) => featureToMesh(f))
    .filter((m): m is MeshData => m !== null);
}
