/**
 * Feature registry — imports and populates the shared feature registry.
 */

export {
  registerFeature,
  getFeatureDefinition,
  getAllFeatureDefinitions,
  getFeaturesByCategory,
  getDefaultParameters,
} from '@opencad/cad/features/feature-registry';

export type { FeatureDefinition, ParameterDef } from '@opencad/cad/features/feature-registry';
