import { describe, it, expect } from 'vitest';
import { FeatureEngine } from '../cad/features/feature-engine';
import type { FeatureNode } from '../types/cad';

// Test the FeatureEngine directly (which useFeatureErrors wraps)
// since testing React hooks requires render which adds complexity

const makeFeature = (id: string, type: string, params: Record<string, unknown> = {}): FeatureNode => ({
  id,
  type: type as FeatureNode['type'],
  name: `${type} ${id}`,
  parameters: params,
  dependencies: [],
  children: [],
  suppressed: false,
});

describe('useFeatureErrors (via FeatureEngine)', () => {
  it('returns empty map for valid features', () => {
    const engine = new FeatureEngine();
    const features = [
      makeFeature('a', 'extrude', { width: 2, height: 2, depth: 2 }),
      makeFeature('b', 'sphere', { radius: 1 }),
    ];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.size).toBe(0);
    expect(results.get('a')!.success).toBe(true);
    expect(results.get('b')!.success).toBe(true);
  });

  it('detects negative dimensions', () => {
    const engine = new FeatureEngine();
    const features = [makeFeature('a', 'extrude', { width: -1, height: 2, depth: 2 })];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.size).toBe(1);
    expect(errors.get('a')).toBe('Dimensions must be positive');
  });

  it('detects zero dimensions', () => {
    const engine = new FeatureEngine();
    const features = [makeFeature('a', 'extrude', { width: 0, height: 2, depth: 2 })];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.size).toBe(1);
    expect(errors.get('a')).toBe('Dimensions must be positive');
  });

  it('detects missing dependency', () => {
    const engine = new FeatureEngine();
    const features = [
      makeFeature('a', 'boolean_subtract', {
        targetRef: 'nonexistent',
        toolRef: 'also-missing',
      }),
    ];
    features[0]!.dependencies = ['nonexistent', 'also-missing'];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.size).toBe(1);
    expect(errors.get('a')).toContain('Missing dependency');
  });

  it('detects dependency with errors', () => {
    const engine = new FeatureEngine();
    const features = [
      makeFeature('a', 'extrude', { width: -1, height: 2, depth: 2 }),
      makeFeature('b', 'shell', {
        targetRef: 'a',
        thickness: 1,
      }),
    ];
    features[1]!.dependencies = ['a'];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    // Feature 'a' has bad params, 'b' depends on 'a' so it should also error
    expect(errors.has('a')).toBe(true);
    expect(errors.has('b')).toBe(true);
  });

  it('detects unknown feature type', () => {
    const engine = new FeatureEngine();
    const features = [makeFeature('a', 'unknown_type', {})];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.size).toBe(1);
    expect(errors.get('a')).toContain('Unknown feature type');
  });

  it('detects missing required parameters', () => {
    const engine = new FeatureEngine();
    const features = [
      makeFeature('a', 'extrude_sketch', {
        // Missing required sketchRef
        depth: 5,
      }),
    ];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.size).toBe(1);
    expect(errors.get('a')).toContain('Missing required parameter');
  });

  it('skips suppressed features', () => {
    const engine = new FeatureEngine();
    const features = [makeFeature('a', 'extrude', { width: -1, height: 2, depth: 2 })];
    features[0]!.suppressed = true;

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    // Suppressed features are not evaluated
    expect(errors.size).toBe(0);
  });

  it('detects boolean subtract with same target and tool', () => {
    const engine = new FeatureEngine();
    const features = [
      makeFeature('a', 'extrude', { width: 2, height: 2, depth: 2 }),
      makeFeature('c', 'boolean_subtract', {
        targetRef: 'a',
        toolRef: 'a', // Same as target — should error
      }),
    ];
    features[1]!.dependencies = ['a'];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.has('c')).toBe(true);
    expect(errors.get('c')).toContain('Target and tool must be different');
  });

  it('detects union with insufficient body references', () => {
    const engine = new FeatureEngine();
    const features = [
      makeFeature('a', 'boolean_union', {
        bodyRefs: 'only-one',
      }),
    ];

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) errors.set(id, result.error);
    }

    expect(errors.has('a')).toBe(true);
    expect(errors.get('a')).toContain('at least 2 body references');
  });

  it('computes bounds for valid features', () => {
    const engine = new FeatureEngine();
    const features = [makeFeature('a', 'extrude', { width: 2, height: 4, depth: 6 })];

    const { results } = engine.rebuildAll(features);
    const result = results.get('a')!;

    expect(result.success).toBe(true);
    expect(result.bounds).toBeDefined();
    expect(result.bounds!.minX).toBe(-1);
    expect(result.bounds!.maxX).toBe(1);
    expect(result.bounds!.minY).toBe(-2);
    expect(result.bounds!.maxY).toBe(2);
    expect(result.bounds!.minZ).toBe(-3);
    expect(result.bounds!.maxZ).toBe(3);
  });
});
