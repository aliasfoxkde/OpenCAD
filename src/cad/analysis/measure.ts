/**
 * Measurement and analysis tools for CAD geometry.
 *
 * Provides point-to-point distance, angle, radius measurement,
 * bounding box, center of mass, surface area, and volume estimation.
 */

import type { MeshData } from '../../types/cad';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Bounds3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface MeasurementResult {
  value: number;
  unit: string;
  label: string;
}

/** Distance between two 3D points */
export function distance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Angle in degrees between two direction vectors (from origin) */
export function angleBetween(a: Point3D, b: Point3D): number {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const lenA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const lenB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);

  if (lenA < 1e-10 || lenB < 1e-10) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (lenA * lenB)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/** Angle in degrees between two lines defined by 4 points */
export function angleBetweenLines(
  p1: Point3D,
  p2: Point3D, // Line 1
  p3: Point3D,
  p4: Point3D, // Line 2
): number {
  const dirA = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
  const dirB = { x: p4.x - p3.x, y: p4.y - p3.y, z: p4.z - p3.z };
  return angleBetween(dirA, dirB);
}

/** Compute axis-aligned bounding box of a mesh */
export function computeBounds(mesh: MeshData): Bounds3D {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = mesh.vertices[i]!;
    const y = mesh.vertices[i + 1]!;
    const z = mesh.vertices[i + 2]!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Compute center of mass (centroid) of mesh vertices */
export function computeCentroid(mesh: MeshData): Point3D {
  const count = mesh.vertices.length / 3;
  if (count === 0) return { x: 0, y: 0, z: 0 };

  let sx = 0,
    sy = 0,
    sz = 0;
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    sx += mesh.vertices[i]!;
    sy += mesh.vertices[i + 1]!;
    sz += mesh.vertices[i + 2]!;
  }

  return { x: sx / count, y: sy / count, z: sz / count };
}

/** Compute surface area from triangle mesh */
export function computeSurfaceArea(mesh: MeshData): number {
  let area = 0;
  const v = mesh.vertices;

  for (let i = 0; i < mesh.indices.length; i += 3) {
    const i0 = mesh.indices[i]! * 3;
    const i1 = mesh.indices[i + 1]! * 3;
    const i2 = mesh.indices[i + 2]! * 3;

    const ax = v[i1]! - v[i0]!;
    const ay = v[i1 + 1]! - v[i0 + 1]!;
    const az = v[i1 + 2]! - v[i0 + 2]!;

    const bx = v[i2]! - v[i0]!;
    const by = v[i2 + 1]! - v[i0 + 1]!;
    const bz = v[i2 + 2]! - v[i0 + 2]!;

    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;

    area += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
  }

  return area;
}

/** Estimate volume using signed tetrahedron method (divergence theorem) */
export function computeVolume(mesh: MeshData): number {
  let volume = 0;
  const v = mesh.vertices;

  for (let i = 0; i < mesh.indices.length; i += 3) {
    const i0 = mesh.indices[i]! * 3;
    const i1 = mesh.indices[i + 1]! * 3;
    const i2 = mesh.indices[i + 2]! * 3;

    const ax = v[i0]!,
      ay = v[i0 + 1]!,
      az = v[i0 + 2]!;
    const bx = v[i1]!,
      by = v[i1 + 1]!,
      bz = v[i1 + 2]!;
    const cx = v[i2]!,
      cy = v[i2 + 1]!,
      cz = v[i2 + 2]!;

    // Signed volume of tetrahedron formed with origin
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }

  return Math.abs(volume);
}

/** Measure distance between two points and return formatted result */
export function measureDistance(a: Point3D, b: Point3D): MeasurementResult {
  return {
    value: distance3D(a, b),
    unit: 'mm',
    label: 'Distance',
  };
}

/** Measure angle between two lines */
export function measureAngle(p1: Point3D, p2: Point3D, p3: Point3D, p4: Point3D): MeasurementResult {
  return {
    value: angleBetweenLines(p1, p2, p3, p4),
    unit: 'deg',
    label: 'Angle',
  };
}

/** Get bounding box dimensions */
export function measureBoundingBox(mesh: MeshData): {
  bounds: Bounds3D;
  width: number;
  height: number;
  depth: number;
} {
  const bounds = computeBounds(mesh);
  return {
    bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    depth: bounds.maxZ - bounds.minZ,
  };
}

/** Get all mass properties for a mesh */
export function getMassProperties(mesh: MeshData) {
  return {
    centroid: computeCentroid(mesh),
    surfaceArea: computeSurfaceArea(mesh),
    volume: computeVolume(mesh),
    bounds: measureBoundingBox(mesh),
  };
}
