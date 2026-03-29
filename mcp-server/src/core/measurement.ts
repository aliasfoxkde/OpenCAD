/**
 * Measurement functions — re-exports from cad/analysis/measure.
 *
 * All functions are pure math, Node.js compatible.
 */

export {
  distance3D,
  angleBetween,
  computeBounds,
  computeCentroid,
  computeSurfaceArea,
  computeVolume,
  measureDistance,
  measureBoundingBox,
  getMassProperties,
} from '@opencad/cad/analysis/measure';

export type { Point3D, Bounds3D, MeasurementResult } from '@opencad/cad/analysis/measure';
