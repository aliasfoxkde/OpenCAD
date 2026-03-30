/** CAD feature types */
export type FeatureType =
  | 'sketch'
  | 'extrude'
  | 'revolve'
  | 'sphere'
  | 'cone'
  | 'torus'
  | 'extrude_sketch'
  | 'revolve_sketch'
  | 'cut'
  | 'revolve_cut'
  | 'sweep'
  | 'loft'
  | 'fillet'
  | 'chamfer'
  | 'shell'
  | 'mirror'
  | 'pattern_linear'
  | 'pattern_circular'
  | 'boolean_union'
  | 'boolean_subtract'
  | 'boolean_intersect'
  | 'hole'
  | 'thread'
  | 'rib'
  | 'draft';

/** A single node in the feature tree */
export interface FeatureNode {
  id: string;
  type: FeatureType;
  name: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  children: string[];
  suppressed: boolean;
  sketchRef?: string;
  error?: string;
}

/** The CAD document model */
export interface CADDocument {
  id: string;
  name: string;
  created: number;
  modified: number;
  version: number;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
}

/** Types of geometric constraints for 2D sketching */
export type ConstraintType =
  | 'coincident'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'horizontal'
  | 'vertical'
  | 'equal'
  | 'midpoint'
  | 'distance'
  | 'angle'
  | 'radius'
  | 'diameter'
  | 'fix';

/** A 2D sketch constraint */
export interface SketchConstraint {
  id: string;
  type: ConstraintType;
  elements: string[];
  value?: number;
  reference?: string;
}

/** Sketch element types */
export type SketchElementType =
  | 'line'
  | 'arc'
  | 'circle'
  | 'ellipse'
  | 'spline'
  | 'point'
  | 'rectangle';

/** A 2D sketch element */
export interface SketchElement {
  id: string;
  type: SketchElementType;
  geometry: Record<string, unknown>;
  construction: boolean;
}

/** A complete 2D sketch */
export interface Sketch {
  id: string;
  plane: 'xy' | 'xz' | 'yz';
  origin: [number, number, number];
  elements: SketchElement[];
  constraints: SketchConstraint[];
}

/** Active tool in the UI */
export type ToolType =
  | 'select'
  | 'box'
  | 'cylinder'
  | 'sphere'
  | 'cone'
  | 'torus'
  | 'sketch_line'
  | 'sketch_arc'
  | 'sketch_circle'
  | 'sketch_rectangle'
  | 'sketch_spline'
  | 'sketch_point'
  | 'sketch_constraint'
  | 'extrude'
  | 'revolve'
  | 'cut'
  | 'fillet'
  | 'chamfer'
  | 'shell'
  | 'measure'
  | 'section'
  | 'hole'
  | 'pattern_linear'
  | 'pattern_circular'
  | 'mirror'
  | 'boolean_union'
  | 'boolean_subtract'
  | 'boolean_intersect';

/** Display mode for the viewport */
export type DisplayMode = 'wireframe' | 'shaded' | 'shaded_edges';

/** Viewport layout */
export type ViewportLayout = 'single' | 'quad';

/** A point in 3D space */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** Tessellated mesh data from the CAD kernel */
export interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  featureId: string;
  color?: string;
}

/** CAD worker message protocol */
export type WorkerRequest =
  | { type: 'init' }
  | { type: 'create_primitive'; id: string; primitive: PrimitiveType; params: Record<string, number> }
  | { type: 'delete_shape'; id: string }
  | { type: 'tessellate'; id: string; angularTolerance?: number; linearTolerance?: number };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'shape_created'; id: string }
  | { type: 'shape_deleted'; id: string }
  | { type: 'tessellation_result'; id: string; mesh: MeshData }
  | { type: 'tessellation_error'; id: string; message: string };

export type PrimitiveType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';

/** Selection types */
export type SelectionTarget =
  | { type: 'feature'; featureId: string }
  | { type: 'face'; featureId: string; faceIndex: number }
  | { type: 'edge'; featureId: string; edgeIndex: number }
  | { type: 'vertex'; featureId: string; vertexIndex: number };
