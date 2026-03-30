import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject } from './project';
import type { FeatureNode } from '../../types/cad';

const makeFeature = (id: string, name: string, overrides: Partial<FeatureNode> = {}): FeatureNode => ({
  id,
  type: 'extrude',
  name,
  parameters: { width: 10, height: 5, depth: 2 },
  dependencies: [],
  children: [],
  suppressed: false,
  ...overrides,
});

describe('serializeProject', () => {
  it('produces valid JSON with all fields', () => {
    const json = serializeProject({
      name: 'Test Project',
      units: 'mm',
      features: [makeFeature('a', 'Box 1')],
      sketches: [],
    });

    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.name).toBe('Test Project');
    expect(parsed.units).toBe('mm');
    expect(parsed.features).toHaveLength(1);
    expect(parsed.features[0].name).toBe('Box 1');
    expect(parsed.created).toBeTypeOf('number');
    expect(parsed.modified).toBeTypeOf('number');
  });

  it('serializes complex features with all parameter types', () => {
    const features: FeatureNode[] = [
      makeFeature('a', 'Box'),
      makeFeature('b', 'Subtract', {
        type: 'boolean_subtract',
        parameters: { targetRef: 'a', toolRef: 'external' },
        dependencies: ['a', 'external'],
      }),
    ];

    const json = serializeProject({ name: 'Complex', units: 'cm', features, sketches: [] });
    const parsed = JSON.parse(json);

    expect(parsed.features[1].parameters.targetRef).toBe('a');
    expect(parsed.features[1].dependencies).toEqual(['a', 'external']);
  });

  it('serializes sketches array', () => {
    const sketches = [
      {
        id: 'sketch-1',
        plane: 'xy',
        elements: [],
        constraints: [],
      },
    ];

    const json = serializeProject({ name: 'Sketch', units: 'mm', features: [], sketches });
    const parsed = JSON.parse(json);

    expect(parsed.sketches).toHaveLength(1);
    expect(parsed.sketches[0].plane).toBe('xy');
  });
});

describe('deserializeProject', () => {
  it('round-trips a simple project', () => {
    const original = serializeProject({
      name: 'Round Trip',
      units: 'mm',
      features: [makeFeature('x', 'Cylinder')],
      sketches: [],
    });

    const project = deserializeProject(original);
    expect(project.version).toBe(1);
    expect(project.name).toBe('Round Trip');
    expect(project.units).toBe('mm');
    expect(project.features).toHaveLength(1);
    expect(project.features[0].name).toBe('Cylinder');
    expect(project.features[0].parameters.width).toBe(10);
  });

  it('round-trips complex features', () => {
    const features: FeatureNode[] = [
      makeFeature('a', 'Body', { parameters: { radius: 5, height: 10 } }),
      makeFeature('b', 'Shell', {
        type: 'shell',
        parameters: { targetRef: 'a', thickness: 0.5 },
        dependencies: ['a'],
      }),
    ];

    const json = serializeProject({ name: 'Shell Test', units: 'in', features, sketches: [] });
    const project = deserializeProject(json);

    expect(project.features[1].type).toBe('shell');
    expect(project.features[1].parameters.targetRef).toBe('a');
    expect(project.features[1].parameters.thickness).toBe(0.5);
    expect(project.units).toBe('in');
  });

  it('throws on unsupported version', () => {
    const badJson = JSON.stringify({ version: 99, name: 'Future' });
    expect(() => deserializeProject(badJson)).toThrow('Unsupported project version: 99');
  });

  it('provides defaults for missing optional fields', () => {
    const minimalJson = JSON.stringify({ version: 1 });
    const project = deserializeProject(minimalJson);

    expect(project.name).toBe('Untitled');
    expect(project.units).toBe('mm');
    expect(project.features).toEqual([]);
    expect(project.sketches).toEqual([]);
    expect(project.created).toBeTypeOf('number');
    expect(project.modified).toBeTypeOf('number');
  });

  it('handles empty features and sketches', () => {
    const json = serializeProject({ name: 'Empty', units: 'm', features: [], sketches: [] });
    const project = deserializeProject(json);

    expect(project.features).toEqual([]);
    expect(project.sketches).toEqual([]);
  });

  it('sets modified timestamp to current time', () => {
    const json = serializeProject({ name: 'Test', units: 'mm', features: [], sketches: [] });
    const before = Date.now();
    const project = deserializeProject(json);
    const after = Date.now();

    expect(project.modified).toBeGreaterThanOrEqual(before);
    expect(project.modified).toBeLessThanOrEqual(after);
  });
});
