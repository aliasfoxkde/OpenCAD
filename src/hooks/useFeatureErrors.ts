import { useMemo, useRef } from 'react';
import { FeatureEngine } from '../cad/features/feature-engine';
import type { FeatureNode } from '../types/cad';

const engine = new FeatureEngine();

/**
 * Compute feature validation errors using FeatureEngine.
 * Returns a Map<featureId, errorMessage> for features that failed validation.
 * Uses ref to persist the engine instance and useMemo for efficient recomputation.
 */
export function useFeatureErrors(features: FeatureNode[]): Map<string, string> {
  // Track last features ref to avoid recomputation when reference hasn't changed
  const lastRef = useRef<unknown>(null);

  return useMemo(() => {
    if (features === lastRef.current) return lastRef.current as Map<string, string>;
    lastRef.current = features;

    const { results } = engine.rebuildAll(features);
    const errors = new Map<string, string>();
    for (const [id, result] of results) {
      if (!result.success && result.error) {
        errors.set(id, result.error);
      }
    }
    return errors;
  }, [features]);
}
