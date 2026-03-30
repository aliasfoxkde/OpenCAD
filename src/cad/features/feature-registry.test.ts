import { describe, it, expect } from 'vitest';
import {
  getFeatureDefinition,
  getAllFeatureDefinitions,
  getFeaturesByCategory,
  getDefaultParameters,
  registerFeature,
} from './feature-registry';

describe('Feature Registry', () => {
  it('should have all primitive feature definitions', () => {
    const primitives = getFeaturesByCategory('primitives');
    expect(primitives.length).toBeGreaterThanOrEqual(5);

    const types = primitives.map((p) => p.type);
    expect(types).toContain('extrude');
    expect(types).toContain('revolve');
    expect(types).toContain('sphere');
    expect(types).toContain('cone');
    expect(types).toContain('torus');
  });

  it('should return feature definition by type', () => {
    const extrude = getFeatureDefinition('extrude');
    expect(extrude).toBeDefined();
    expect(extrude!.label).toBe('Extrude');
    expect(extrude!.category).toBe('primitives');
    expect(extrude!.parameters.length).toBeGreaterThan(0);
  });

  it('should return undefined for unknown type', () => {
    expect(getFeatureDefinition('nonexistent')).toBeUndefined();
  });

  it('should get features by category', () => {
    const edges = getFeaturesByCategory('edges');
    expect(edges.length).toBeGreaterThanOrEqual(2);

    const types = edges.map((e) => e.type);
    expect(types).toContain('fillet');
    expect(types).toContain('chamfer');
  });

  it('should get default parameters for a feature', () => {
    const defaults = getDefaultParameters('extrude');
    expect(defaults.width).toBe(2);
    expect(defaults.height).toBe(2);
    expect(defaults.depth).toBe(2);
    expect(defaults.originX).toBe(0);
    expect(defaults.originY).toBe(0);
    expect(defaults.originZ).toBe(0);
  });

  it('should return empty object for unknown type defaults', () => {
    expect(getDefaultParameters('nonexistent')).toEqual({});
  });

  it('should have all boolean operations', () => {
    const booleanOps = getFeaturesByCategory('boolean');
    expect(booleanOps.length).toBe(3);

    const types = booleanOps.map((b) => b.type);
    expect(types).toContain('boolean_union');
    expect(types).toContain('boolean_subtract');
    expect(types).toContain('boolean_intersect');
  });

  it('should have all pattern features', () => {
    const patterns = getFeaturesByCategory('patterns');
    expect(patterns.length).toBe(3);

    const types = patterns.map((p) => p.type);
    expect(types).toContain('pattern_linear');
    expect(types).toContain('pattern_circular');
    expect(types).toContain('mirror');
  });

  it('should register a custom feature', () => {
    registerFeature({
      type: 'custom_test',
      label: 'Custom Test',
      icon: 'T',
      category: 'features',
      description: 'A test feature',
      parameters: [{ name: 'value', label: 'Value', type: 'number', default: 10, min: 0 }],
    });

    const def = getFeatureDefinition('custom_test');
    expect(def).toBeDefined();
    expect(def!.label).toBe('Custom Test');
    expect(getDefaultParameters('custom_test').value).toBe(10);
  });

  it('should list all feature definitions', () => {
    const all = getAllFeatureDefinitions();
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it('should have sketch-based features marked', () => {
    const extrudeSketch = getFeatureDefinition('extrude_sketch');
    expect(extrudeSketch?.requiresSketch).toBe(true);

    const cut = getFeatureDefinition('cut');
    expect(cut?.requiresSketch).toBe(true);
    expect(cut?.requiresBody).toBe(true);
  });

  it('should have parameter constraints', () => {
    const extrude = getFeatureDefinition('extrude');
    const widthParam = extrude!.parameters.find((p) => p.name === 'width');
    expect(widthParam?.min).toBe(0.01);
    expect(widthParam?.step).toBe(0.1);
    expect(widthParam?.unit).toBe('mm');
  });

  it('should have mesh_import feature for imported geometry', () => {
    const def = getFeatureDefinition('mesh_import');
    expect(def).toBeDefined();
    expect(def!.label).toBe('Imported Mesh');
    expect(def!.category).toBe('primitives');
    expect(def!.icon).toBe('📦');
    const params = def!.parameters.map((p) => p.name);
    expect(params).toContain('vertexCount');
    expect(params).toContain('faceCount');
    expect(params).toContain('sourceFile');
  });

  it('should have assembly feature', () => {
    const def = getFeatureDefinition('assembly');
    expect(def).toBeDefined();
    expect(def!.label).toBe('Assembly');
    expect(def!.category).toBe('assembly');
  });
});
