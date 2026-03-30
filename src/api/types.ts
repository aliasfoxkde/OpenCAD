/**
 * Shared types for the OpenCAD client API.
 */

import type { FeatureNode, MeshData } from '@/types/cad';
import type { Point3D, Bounds3D } from '@/cad/analysis/measure';
import type { FeatureDefinition, ParameterDef } from '@/cad/features/feature-registry';
import type { SketchData } from '@/cad/io/project';

/** Standard API response wrapper */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Feature summary for listing */
export interface FeatureSummary {
  id: string;
  type: string;
  name: string;
  suppressed: boolean;
  parameterCount: number;
  dependencyCount: number;
  childCount: number;
}

/** Full feature details including definition schema */
export interface FeatureDetail {
  feature: FeatureNode;
  definition?: FeatureDefinition;
}

/** Available feature type info */
export interface AvailableFeature {
  type: string;
  label: string;
  category: string;
  description: string;
  parameters: ParameterDef[];
}

/** Measurement result types */
export interface DistanceResult {
  distance: number;
  pointA: Point3D;
  pointB: Point3D;
}

export interface MassPropertiesResult {
  centroid: Point3D;
  surfaceArea: number;
  volume: number;
  bounds: BoundingBoxResult;
}

export interface BoundingBoxResult {
  bounds: Bounds3D;
  width: number;
  height: number;
  depth: number;
}

/** Export format options */
export type ExportFormat = 'stl' | 'obj' | 'glb' | '3mf' | 'ocad';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  meshes?: MeshData[];
  features?: FeatureNode[];
  project?: {
    name: string;
    units: string;
    features: FeatureNode[];
    sketches: SketchData[];
  };
}

export interface ExportResult {
  data: ArrayBuffer | string;
  filename: string;
  mimeType: string;
}

/** Document operations */
export interface CreateDocumentOptions {
  name?: string;
  units?: 'mm' | 'cm' | 'm' | 'in';
}

export interface DocumentInfo {
  id: string;
  name: string;
  created: number;
  modified: number;
  featureCount: number;
  units: string;
}

/** Re-export key types for consumer convenience */
export type { FeatureNode, MeshData } from '@/types/cad';

export type { Point3D, Bounds3D, MeasurementResult } from '@/cad/analysis/measure';

export type { DocumentMeta, StoredDocument } from '@/cad/io/db';

export type { FeatureDefinition, ParameterDef } from '@/cad/features/feature-registry';
