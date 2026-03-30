import { describe, it, expect } from 'vitest';
import { featureToMesh, featuresToMeshes } from './feature-to-mesh';
import type { FeatureNode } from '../types/cad';

const makeFeature = (overrides: Partial<FeatureNode> = {}): FeatureNode => ({
  id: 'f1',
  type: 'extrude',
  name: 'Box',
  parameters: { width: 2, height: 2, depth: 2 },
  dependencies: [],
  children: [],
  suppressed: false,
  ...overrides,
});

describe('feature-to-mesh', () => {
  it('should convert extrude feature to mesh', () => {
    const mesh = featureToMesh(makeFeature());
    expect(mesh).not.toBeNull();
    expect(mesh!.vertices.length).toBeGreaterThan(0);
    expect(mesh!.indices.length).toBeGreaterThan(0);
  });

  it('should convert sphere feature to mesh', () => {
    const mesh = featureToMesh(makeFeature({ type: 'sphere', parameters: { radius: 3 } }));
    expect(mesh).not.toBeNull();
  });

  it('should return null for unknown feature type', () => {
    const mesh = featureToMesh(makeFeature({ type: 'sketch' }));
    expect(mesh).toBeNull();
  });

  it('should convert hole feature to mesh', () => {
    const mesh = featureToMesh(makeFeature({
      type: 'hole',
      parameters: { diameter: 6, depth: 10 },
    }));
    expect(mesh).not.toBeNull();
    expect(mesh!.vertices.length).toBeGreaterThan(0);
    expect(mesh!.indices.length).toBeGreaterThan(0);
  });

  it('should assign featureId to hole mesh', () => {
    const mesh = featureToMesh(makeFeature({
      id: 'hole-42',
      type: 'hole',
      parameters: { diameter: 4, depth: 8 },
    }));
    expect(mesh!.featureId).toBe('hole-42');
  });

  it('should skip suppressed features', () => {
    const features = [
      makeFeature({ id: 'a' }),
      makeFeature({ id: 'b', suppressed: true }),
      makeFeature({ id: 'c' }),
    ];
    const meshes = featuresToMeshes(features);
    expect(meshes).toHaveLength(2);
    expect(meshes[0]!.featureId).toBe('a');
    expect(meshes[1]!.featureId).toBe('c');
  });

  it('should handle empty features array', () => {
    expect(featuresToMeshes([])).toEqual([]);
  });
});
