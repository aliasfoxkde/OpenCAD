/**
 * Feature Registry — defines all feature types, their parameter schemas,
 * default values, and metadata. This is the single source of truth for
 * what features exist and how they are configured.
 */

export interface ParameterDef {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'reference';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  required?: boolean;
  enumValues?: string[];
  description?: string;
}

export interface FeatureDefinition {
  type: string;
  label: string;
  icon: string;
  category: 'primitives' | 'features' | 'edges' | 'patterns' | 'boolean' | 'sketch' | 'assembly';
  parameters: ParameterDef[];
  requiresSketch?: boolean;
  requiresBody?: boolean;
  description: string;
}

/** All feature definitions indexed by type */
const registry = new Map<string, FeatureDefinition>();

export function registerFeature(def: FeatureDefinition): void {
  registry.set(def.type, def);
}

export function getFeatureDefinition(type: string): FeatureDefinition | undefined {
  return registry.get(type);
}

export function getAllFeatureDefinitions(): FeatureDefinition[] {
  return Array.from(registry.values());
}

export function getFeaturesByCategory(category: string): FeatureDefinition[] {
  return Array.from(registry.values()).filter((d) => d.category === category);
}

export function getDefaultParameters(type: string): Record<string, unknown> {
  const def = registry.get(type);
  if (!def) return {};
  const params: Record<string, unknown> = {};
  for (const p of def.parameters) {
    params[p.name] = p.default;
  }
  return params;
}

// ============================================================
// Register all built-in features
// ============================================================

// --- Primitives ---

registerFeature({
  type: 'extrude',
  label: 'Extrude',
  icon: '⬜',
  category: 'primitives',
  description: 'Create a box by extruding a rectangular profile',
  parameters: [
    { name: 'width', label: 'Width', type: 'number', default: 2, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'height', label: 'Height', type: 'number', default: 2, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'depth', label: 'Depth', type: 'number', default: 2, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'revolve',
  label: 'Revolve',
  icon: '🔵',
  category: 'primitives',
  description: 'Create a cylinder by revolving a circular profile',
  parameters: [
    { name: 'radius', label: 'Radius', type: 'number', default: 0.5, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'height', label: 'Height', type: 'number', default: 2, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'segments', label: 'Segments', type: 'number', default: 32, min: 6, max: 128, step: 1 },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'sphere',
  label: 'Sphere',
  icon: '⚪',
  category: 'primitives',
  description: 'Create a sphere',
  parameters: [
    { name: 'radius', label: 'Radius', type: 'number', default: 1, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'cone',
  label: 'Cone',
  icon: '△',
  category: 'primitives',
  description: 'Create a cone',
  parameters: [
    { name: 'radius', label: 'Base Radius', type: 'number', default: 0.5, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'height', label: 'Height', type: 'number', default: 2, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'torus',
  label: 'Torus',
  icon: '◎',
  category: 'primitives',
  description: 'Create a torus',
  parameters: [
    { name: 'radius', label: 'Radius', type: 'number', default: 0.5, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'tube', label: 'Tube Radius', type: 'number', default: 0.15, min: 0.01, step: 0.01, unit: 'mm' },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

// --- Features (sketch-based) ---

registerFeature({
  type: 'extrude_sketch',
  label: 'Extrude Sketch',
  icon: '↕',
  category: 'features',
  description: 'Extrude a 2D sketch profile into a 3D solid',
  requiresSketch: true,
  parameters: [
    { name: 'sketchRef', label: 'Sketch', type: 'reference', default: '', required: true },
    { name: 'profile', label: 'Profile', type: 'string', default: '', description: 'JSON: [[x,y], ...] 2D polygon points' },
    { name: 'plane', label: 'Plane', type: 'enum', default: 'xy', enumValues: ['xy', 'xz', 'yz'] },
    { name: 'depth', label: 'Depth', type: 'number', default: 5, min: 0.01, step: 0.1, unit: 'mm' },
    {
      name: 'direction',
      label: 'Direction',
      type: 'enum',
      default: 'normal',
      enumValues: ['normal', 'reverse', 'symmetric'],
    },
    { name: 'draft', label: 'Draft Angle', type: 'number', default: 0, min: -45, max: 45, step: 1, unit: '°' },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'revolve_sketch',
  label: 'Revolve Sketch',
  icon: '↻',
  category: 'features',
  description: 'Revolve a 2D sketch profile around an axis',
  requiresSketch: true,
  parameters: [
    { name: 'sketchRef', label: 'Sketch', type: 'reference', default: '', required: true },
    { name: 'profile', label: 'Profile', type: 'string', default: '', description: 'JSON: [[r,h], ...] 2D profile (distance, height)' },
    { name: 'axis', label: 'Axis', type: 'enum', default: 'y', enumValues: ['x', 'y', 'z'] },
    { name: 'angle', label: 'Angle', type: 'number', default: 360, min: 0.01, max: 360, step: 1, unit: '°' },
    { name: 'segments', label: 'Segments', type: 'number', default: 32, min: 6, max: 128, step: 1 },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'cut',
  label: 'Extrude Cut',
  icon: '✂',
  category: 'features',
  description: 'Cut material by extruding a sketch profile',
  requiresSketch: true,
  requiresBody: true,
  parameters: [
    { name: 'sketchRef', label: 'Sketch', type: 'reference', default: '', required: true },
    { name: 'targetRef', label: 'Target Body', type: 'reference', default: '', required: true },
    { name: 'profile', label: 'Profile', type: 'string', default: '', description: 'JSON: [[x,y], ...] 2D polygon points' },
    { name: 'plane', label: 'Plane', type: 'enum', default: 'xy', enumValues: ['xy', 'xz', 'yz'] },
    { name: 'depth', label: 'Depth', type: 'number', default: 5, min: 0.01, step: 0.1, unit: 'mm' },
    {
      name: 'direction',
      label: 'Direction',
      type: 'enum',
      default: 'normal',
      enumValues: ['normal', 'reverse', 'symmetric'],
    },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'sweep',
  label: 'Sweep',
  icon: '〜',
  category: 'features',
  description: 'Sweep a profile along a path',
  requiresSketch: true,
  parameters: [
    { name: 'profileRef', label: 'Profile', type: 'reference', default: '', required: true },
    { name: 'pathRef', label: 'Path', type: 'reference', default: '', required: true },
  ],
});

registerFeature({
  type: 'loft',
  label: 'Loft',
  icon: '⌒',
  category: 'features',
  description: 'Create a loft between two or more profiles',
  requiresSketch: true,
  parameters: [
    {
      name: 'profileRefs',
      label: 'Profiles',
      type: 'string',
      default: '',
      required: true,
      description: 'Comma-separated sketch IDs',
    },
  ],
});

// --- Edge Features ---

registerFeature({
  type: 'fillet',
  label: 'Fillet',
  icon: '≂',
  category: 'edges',
  description: 'Round edges with a specified radius',
  requiresBody: true,
  parameters: [
    { name: 'radius', label: 'Radius', type: 'number', default: 1, min: 0.01, step: 0.1, unit: 'mm' },
    {
      name: 'edgeIndices',
      label: 'Edges',
      type: 'string',
      default: '',
      description: 'Comma-separated edge indices (empty = all edges)',
    },
  ],
});

registerFeature({
  type: 'chamfer',
  label: 'Chamfer',
  icon: '⚲',
  category: 'edges',
  description: 'Bevel edges',
  requiresBody: true,
  parameters: [
    { name: 'distance', label: 'Distance', type: 'number', default: 0.5, min: 0.01, step: 0.1, unit: 'mm' },
    { name: 'angle', label: 'Angle', type: 'number', default: 45, min: 0, max: 90, step: 1, unit: '°' },
    { name: 'edgeIndices', label: 'Edges', type: 'string', default: '', description: 'Comma-separated edge indices' },
  ],
});

// --- Shell ---

registerFeature({
  type: 'shell',
  label: 'Shell',
  icon: '□',
  category: 'features',
  description: 'Hollow out a solid body',
  requiresBody: true,
  parameters: [
    { name: 'targetRef', label: 'Target Body', type: 'reference', default: '', required: true },
    { name: 'thickness', label: 'Wall Thickness', type: 'number', default: 1, min: 0.1, step: 0.1, unit: 'mm' },
    { name: 'removeFaces', label: 'Remove Faces', type: 'string', default: '', description: 'Face indices to remove' },
  ],
});

// --- Boolean Operations ---

registerFeature({
  type: 'boolean_union',
  label: 'Union',
  icon: '∪',
  category: 'boolean',
  description: 'Join two or more bodies into one',
  requiresBody: true,
  parameters: [
    {
      name: 'bodyRefs',
      label: 'Bodies',
      type: 'string',
      default: '',
      required: true,
      description: 'Comma-separated feature IDs to union',
    },
  ],
});

registerFeature({
  type: 'boolean_subtract',
  label: 'Subtract',
  icon: '∖',
  category: 'boolean',
  description: 'Subtract one body from another',
  requiresBody: true,
  parameters: [
    { name: 'targetRef', label: 'Target', type: 'reference', default: '', required: true },
    { name: 'toolRef', label: 'Tool', type: 'reference', default: '', required: true },
  ],
});

registerFeature({
  type: 'boolean_intersect',
  label: 'Intersect',
  icon: '∩',
  category: 'boolean',
  description: 'Keep only the intersection of two bodies',
  requiresBody: true,
  parameters: [
    {
      name: 'bodyRefs',
      label: 'Bodies',
      type: 'string',
      default: '',
      required: true,
      description: 'Comma-separated feature IDs',
    },
  ],
});

// --- Patterns ---

registerFeature({
  type: 'pattern_linear',
  label: 'Linear Pattern',
  icon: '≡',
  category: 'patterns',
  description: 'Repeat features in a linear array',
  requiresBody: true,
  parameters: [
    { name: 'featureRef', label: 'Feature', type: 'reference', default: '', required: true },
    { name: 'direction', label: 'Direction', type: 'enum', default: 'x', enumValues: ['x', 'y', 'z'] },
    { name: 'count', label: 'Count', type: 'number', default: 3, min: 1, max: 100, step: 1 },
    { name: 'spacing', label: 'Spacing', type: 'number', default: 5, min: 0.01, step: 0.1, unit: 'mm' },
  ],
});

registerFeature({
  type: 'pattern_circular',
  label: 'Circular Pattern',
  icon: '◉',
  category: 'patterns',
  description: 'Repeat features in a circular array',
  requiresBody: true,
  parameters: [
    { name: 'featureRef', label: 'Feature', type: 'reference', default: '', required: true },
    { name: 'axis', label: 'Axis', type: 'enum', default: 'z', enumValues: ['x', 'y', 'z'] },
    { name: 'count', label: 'Count', type: 'number', default: 6, min: 1, max: 100, step: 1 },
    { name: 'angle', label: 'Total Angle', type: 'number', default: 360, min: 0.01, max: 360, step: 1, unit: '°' },
  ],
});

registerFeature({
  type: 'mirror',
  label: 'Mirror',
  icon: '⇔',
  category: 'patterns',
  description: 'Mirror features across a plane',
  requiresBody: true,
  parameters: [
    { name: 'featureRef', label: 'Feature', type: 'reference', default: '', required: true },
    { name: 'plane', label: 'Mirror Plane', type: 'enum', default: 'yz', enumValues: ['xy', 'xz', 'yz'] },
  ],
});

// --- Hole ---

registerFeature({
  type: 'hole',
  label: 'Hole',
  icon: '◎',
  category: 'features',
  description: 'Create a hole feature',
  requiresBody: true,
  parameters: [
    { name: 'diameter', label: 'Diameter', type: 'number', default: 5, min: 0.1, step: 0.1, unit: 'mm' },
    { name: 'depth', label: 'Depth', type: 'number', default: 10, min: 0.1, step: 0.1, unit: 'mm' },
    {
      name: 'type',
      label: 'Hole Type',
      type: 'enum',
      default: 'simple',
      enumValues: ['simple', 'counterbore', 'countersink'],
    },
    {
      name: 'cbDiameter',
      label: 'CB Diameter',
      type: 'number',
      default: 8,
      min: 0.1,
      step: 0.1,
      unit: 'mm',
      description: 'Counterbore/Countersink diameter',
    },
    {
      name: 'cbDepth',
      label: 'CB Depth',
      type: 'number',
      default: 3,
      min: 0.1,
      step: 0.1,
      unit: 'mm',
      description: 'Counterbore/Countersink depth',
    },
    { name: 'originX', label: 'Origin X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originY', label: 'Origin Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'originZ', label: 'Origin Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
  ],
});

// --- Assembly ---

registerFeature({
  type: 'assembly',
  label: 'Assembly',
  icon: '\u{1F4C1}',
  category: 'assembly',
  description: 'Group features into a sub-assembly with its own position and rotation',
  parameters: [
    { name: 'positionX', label: 'Position X', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'positionY', label: 'Position Y', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    { name: 'positionZ', label: 'Position Z', type: 'number', default: 0, step: 0.1, unit: 'mm' },
    {
      name: 'rotationX',
      label: 'Rotation X',
      type: 'number',
      default: 0,
      min: -360,
      max: 360,
      step: 1,
      unit: '\u00B0',
    },
    {
      name: 'rotationY',
      label: 'Rotation Y',
      type: 'number',
      default: 0,
      min: -360,
      max: 360,
      step: 1,
      unit: '\u00B0',
    },
    {
      name: 'rotationZ',
      label: 'Rotation Z',
      type: 'number',
      default: 0,
      min: -360,
      max: 360,
      step: 1,
      unit: '\u00B0',
    },
  ],
});

// --- Imported Mesh ---

registerFeature({
  type: 'mesh_import',
  label: 'Imported Mesh',
  icon: '📦',
  category: 'primitives',
  description: 'Mesh geometry imported from an external file (STL, OBJ)',
  parameters: [
    { name: 'vertexCount', label: 'Vertex Count', type: 'number', default: 0 },
    { name: 'faceCount', label: 'Face Count', type: 'number', default: 0 },
    { name: 'sourceFile', label: 'Source File', type: 'string', default: '' },
  ],
});
