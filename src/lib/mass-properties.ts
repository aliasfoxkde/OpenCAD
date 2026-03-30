/**
 * Mass Properties — computes volume, surface area, bounding box,
 * and center of mass from MeshData.
 */

import type { MeshData } from '../types/cad';
import { featuresToMeshes, featureToMesh } from './feature-to-mesh';
import type { FeatureNode } from '../types/cad';

export interface MassProperties {
  volume: number;
  surfaceArea: number;
  boundingBox: {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
  } | null;
  centerOfMass: { x: number; y: number; z: number } | null;
  triangleCount: number;
  vertexCount: number;
}

/**
 * Compute signed volume of a tetrahedron formed by a triangle and the origin.
 * Uses the divergence theorem: V = (1/6) * sum(v1 . (v2 x v3))
 */
function tetrahedronSignedVolume(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  x3: number,
  y3: number,
  z3: number,
): number {
  return (x1 * (y2 * z3 - y3 * z2) - x2 * (y1 * z3 - y3 * z1) + x3 * (y1 * z2 - y2 * z1)) / 6;
}

/**
 * Compute the area of a triangle given its three vertices.
 */
function triangleArea(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  x3: number,
  y3: number,
  z3: number,
): number {
  const ax = x2 - x1,
    ay = y2 - y1,
    az = z2 - z1;
  const bx = x3 - x1,
    by = y3 - y1,
    bz = z3 - z1;
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
}

/**
 * Compute mass properties from a single MeshData.
 */
export function computeMeshProperties(mesh: MeshData): MassProperties {
  const { vertices, indices } = mesh;
  let volume = 0;
  let surfaceArea = 0;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  // Compute bounding box from all vertices
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!;
    const y = vertices[i + 1]!;
    const z = vertices[i + 2]!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  // Accumulate volume and surface area from each triangle
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i]! * 3;
    const i1 = indices[i + 1]! * 3;
    const i2 = indices[i + 2]! * 3;

    const x1 = vertices[i0]!,
      y1 = vertices[i0 + 1]!,
      z1 = vertices[i0 + 2]!;
    const x2 = vertices[i1]!,
      y2 = vertices[i1 + 1]!,
      z2 = vertices[i1 + 2]!;
    const x3 = vertices[i2]!,
      y3 = vertices[i2 + 1]!,
      z3 = vertices[i2 + 2]!;

    volume += tetrahedronSignedVolume(x1, y1, z1, x2, y2, z2, x3, y3, z3);
    surfaceArea += triangleArea(x1, y1, z1, x2, y2, z2, x3, y3, z3);
  }

  volume = Math.abs(volume);

  // Center of mass is the centroid of the bounding box (approximation for convex hulls)
  // More accurate would be volume-weighted, but this is good enough for display
  const centerOfMass = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };

  return {
    volume,
    surfaceArea,
    boundingBox: { minX, minY, minZ, maxX, maxY, maxZ },
    centerOfMass,
    triangleCount: indices.length / 3,
    vertexCount: vertices.length / 3,
  };
}

/**
 * Compute combined mass properties for all features.
 */
export function computeAllProperties(features: FeatureNode[]): MassProperties {
  const meshes = featuresToMeshes(features);

  if (meshes.length === 0) {
    return {
      volume: 0,
      surfaceArea: 0,
      boundingBox: null,
      centerOfMass: null,
      triangleCount: 0,
      vertexCount: 0,
    };
  }

  let totalVolume = 0;
  let totalSurfaceArea = 0;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  let totalTriangles = 0;
  let totalVertices = 0;

  for (const mesh of meshes) {
    const props = computeMeshProperties(mesh);
    totalVolume += props.volume;
    totalSurfaceArea += props.surfaceArea;
    totalTriangles += props.triangleCount;
    totalVertices += props.vertexCount;

    if (props.boundingBox) {
      const bb = props.boundingBox;
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.minZ < minZ) minZ = bb.minZ;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
      if (bb.maxZ > maxZ) maxZ = bb.maxZ;
    }
  }

  return {
    volume: totalVolume,
    surfaceArea: totalSurfaceArea,
    boundingBox: { minX, minY, minZ, maxX, maxY, maxZ },
    centerOfMass: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
    triangleCount: totalTriangles,
    vertexCount: totalVertices,
  };
}

/**
 * Compute mass properties for a single feature by ID.
 * Returns null if the feature is not found or has no mesh.
 */
export function computeFeatureProperties(features: FeatureNode[], featureId: string): MassProperties | null {
  const feature = features.find((f) => f.id === featureId);
  if (!feature || feature.suppressed) return null;

  // Use featureToMesh for a single feature
  const mesh = featureToMesh(feature, features);
  if (!mesh) return null;

  return computeMeshProperties(mesh);
}

/** Format a number for display with appropriate precision */
export function formatPropertyValue(value: number, unit: string): string {
  if (Math.abs(value) < 0.001) return `0 ${unit}`;
  if (Math.abs(value) >= 1000) return `${value.toFixed(0)} ${unit}`;
  if (Math.abs(value) >= 100) return `${value.toFixed(1)} ${unit}`;
  if (Math.abs(value) >= 1) return `${value.toFixed(2)} ${unit}`;
  return `${value.toFixed(3)} ${unit}`;
}
