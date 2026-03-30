/**
 * Feature management API — wraps cad-store and feature-registry.
 */

import { useCADStore } from '@/stores/cad-store';
import { getFeatureDefinition, getAllFeatureDefinitions, getDefaultParameters } from '@/cad/features/feature-registry';
import type { FeatureNode, FeatureType } from '@/types/cad';
import type { APIResponse, FeatureSummary, FeatureDetail, AvailableFeature } from './types';
import { nanoid } from 'nanoid';

/** Get all features in the current document */
export function getFeatures(): FeatureNode[] {
  return useCADStore.getState().features;
}

/** Get a single feature by ID */
export function getFeature(id: string): FeatureNode | undefined {
  return useCADStore.getState().features.find((f) => f.id === id);
}

/** Add a feature to the current document */
export function addFeature(
  type: FeatureType,
  name?: string,
  parameters?: Record<string, unknown>,
): APIResponse<FeatureNode> {
  try {
    const defaults = getDefaultParameters(type);
    const feature: FeatureNode = {
      id: nanoid(),
      type,
      name: name ?? type,
      parameters: { ...defaults, ...parameters },
      dependencies: [],
      children: [],
      suppressed: false,
    };
    useCADStore.getState().addFeature(feature);
    return { success: true, data: feature };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Remove a feature by ID */
export function removeFeature(id: string): APIResponse<void> {
  try {
    useCADStore.getState().removeFeature(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Update feature parameters */
export function modifyFeature(id: string, updates: Partial<FeatureNode>): APIResponse<FeatureNode> {
  try {
    const store = useCADStore.getState();
    const existing = store.features.find((f) => f.id === id);
    if (!existing) {
      return { success: false, error: `Feature "${id}" not found` };
    }
    store.updateFeature(id, updates);
    const updated = store.features.find((f) => f.id === id);
    return { success: true, data: updated };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Get feature summaries */
export function getFeatureSummaries(): FeatureSummary[] {
  return useCADStore.getState().features.map((f) => ({
    id: f.id,
    type: f.type,
    name: f.name,
    suppressed: f.suppressed,
    parameterCount: Object.keys(f.parameters).length,
    dependencyCount: f.dependencies.length,
    childCount: f.children.length,
  }));
}

/** Get full feature details including definition schema */
export function getFeatureDetails(id: string): APIResponse<FeatureDetail> {
  const feature = getFeature(id);
  if (!feature) {
    return { success: false, error: `Feature "${id}" not found` };
  }
  const definition = getFeatureDefinition(feature.type);
  return { success: true, data: { feature, definition } };
}

/** List all available feature types */
export function listAvailableFeatures(): AvailableFeature[] {
  return getAllFeatureDefinitions().map((def) => ({
    type: def.type,
    label: def.label,
    category: def.category,
    description: def.description,
    parameters: def.parameters,
  }));
}

/** Get default parameters for a feature type */
export function getFeatureDefaults(type: string): Record<string, unknown> {
  return getDefaultParameters(type);
}
