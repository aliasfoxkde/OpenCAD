/**
 * Measurement API — wraps cad/analysis/measure.
 */

import {
  distance3D,
  angleBetween,
  computeBounds,
  computeCentroid,
  computeSurfaceArea,
  computeVolume,
  measureBoundingBox,
  getMassProperties,
} from '@/cad/analysis/measure';
import type { Point3D, MeshData } from '@/types/cad';
import type { Bounds3D } from '@/cad/analysis/measure';
import type { DistanceResult, MassPropertiesResult, BoundingBoxResult } from './types';

/** Measure distance between two 3D points */
export function measureDistanceBetween(a: Point3D, b: Point3D): DistanceResult {
  return {
    distance: distance3D(a, b),
    pointA: a,
    pointB: b,
  };
}

/** Measure angle between two vectors (radians) */
export function measureAngleBetween(a: Point3D, b: Point3D): number {
  return angleBetween(a, b);
}

/** Compute bounding box of a mesh */
export function computeMeshBounds(mesh: MeshData): BoundingBoxResult {
  return measureBoundingBox(mesh);
}

/** Compute mass properties of a mesh */
export function computeMeshMassProperties(mesh: MeshData): MassPropertiesResult {
  return getMassProperties(mesh);
}

/** Compute centroid of a mesh */
export function computeMeshCentroid(mesh: MeshData): Point3D {
  return computeCentroid(mesh);
}

/** Compute surface area of a mesh */
export function computeMeshSurfaceArea(mesh: MeshData): number {
  return computeSurfaceArea(mesh);
}

/** Compute volume of a mesh */
export function computeMeshVolume(mesh: MeshData): number {
  return computeVolume(mesh);
}

/** Compute raw bounds of a mesh */
export function getRawBounds(mesh: MeshData): Bounds3D {
  return computeBounds(mesh);
}

/** Re-export the measure module's result type */
export type { MeasurementResult } from '@/cad/analysis/measure';
