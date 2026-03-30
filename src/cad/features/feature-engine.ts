/**
 * Feature Engine — evaluates the feature tree topologically, manages
 * parametric rebuilds, and tracks feature health/errors.
 *
 * The engine takes an ordered list of FeatureNodes, builds a dependency
 * graph, and evaluates them in topological order. Each feature type has
 * a compute function that validates parameters and returns geometry metadata.
 */

import type { FeatureNode } from '../../types/cad';
import { DependencyGraph } from './dependency-graph';
import { getFeatureDefinition, getDefaultParameters } from './feature-registry';

export interface FeatureResult {
  id: string;
  success: boolean;
  error?: string;
  /** Bounding box { minX, minY, minZ, maxX, maxY, maxZ } */
  bounds?: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
}

export interface RebuildResult {
  results: Map<string, FeatureResult>;
  errors: string[];
  rebuildOrder: string[];
}

export class FeatureEngine {
  private graph = new DependencyGraph();
  private results = new Map<string, FeatureResult>();

  /** Rebuild the entire feature tree from scratch */
  rebuildAll(features: FeatureNode[]): RebuildResult {
    this.graph.clear();
    this.results.clear();

    const errors: string[] = [];

    // Build dependency graph
    for (const feature of features) {
      if (feature.suppressed) continue;
      this.graph.addNode(feature.id, feature.dependencies);
    }

    // Get evaluation order
    let rebuildOrder: string[];
    try {
      rebuildOrder = this.graph.topologicalSort();
    } catch (e) {
      return {
        results: this.results,
        errors: [`Topological sort failed: ${(e as Error).message}`],
        rebuildOrder: [],
      };
    }

    // Create lookup map
    const featureMap = new Map(features.map((f) => [f.id, f]));

    // Evaluate each feature in order
    for (const id of rebuildOrder) {
      const feature = featureMap.get(id);
      if (!feature || feature.suppressed) continue;

      const result = this.evaluateFeature(feature, featureMap);
      this.results.set(id, result);

      if (!result.success && result.error) {
        errors.push(`${feature.name} (${id}): ${result.error}`);
      }
    }

    return { results: this.results, errors, rebuildOrder };
  }

  /**
   * Rebuild only the features affected by a change to the given feature.
   * Returns the evaluation results for affected features only.
   */
  rebuildFrom(features: FeatureNode[], changedId: string): RebuildResult {
    // Ensure the graph is up to date
    this.rebuildAll(features);
    return this.rebuildAffected(features, changedId);
  }

  /** Internal: rebuild features downstream of a changed feature */
  private rebuildAffected(features: FeatureNode[], changedId: string): RebuildResult {
    const errors: string[] = [];
    const affected = [changedId, ...this.graph.getDescendants(changedId)];
    const rebuildOrder = this.graph.getEvaluationOrder(affected);
    const featureMap = new Map(features.map((f) => [f.id, f]));

    for (const id of rebuildOrder) {
      const feature = featureMap.get(id);
      if (!feature || feature.suppressed) continue;

      const result = this.evaluateFeature(feature, featureMap);
      this.results.set(id, result);

      if (!result.success && result.error) {
        errors.push(`${feature.name} (${id}): ${result.error}`);
      }
    }

    return { results: this.results, errors, rebuildOrder };
  }

  /** Evaluate a single feature */
  private evaluateFeature(feature: FeatureNode, featureMap: Map<string, FeatureNode>): FeatureResult {
    const def = getFeatureDefinition(feature.type);

    if (!def) {
      return {
        id: feature.id,
        success: false,
        error: `Unknown feature type: ${feature.type}`,
      };
    }

    // Validate required parameters
    for (const paramDef of def.parameters) {
      if (paramDef.required && !feature.parameters[paramDef.name]) {
        return {
          id: feature.id,
          success: false,
          error: `Missing required parameter: ${paramDef.label}`,
        };
      }
    }

    // Validate dependencies exist and are not errored
    for (const depId of feature.dependencies) {
      const depFeature = featureMap.get(depId);
      if (!depFeature) {
        return {
          id: feature.id,
          success: false,
          error: `Missing dependency: ${depId}`,
        };
      }
      const depResult = this.results.get(depId);
      if (depResult && !depResult.success) {
        return {
          id: feature.id,
          success: false,
          error: `Dependency ${depFeature.name} has errors`,
        };
      }
    }

    // Type-specific validation
    const validationError = this.validateFeatureParams(feature);
    if (validationError) {
      return { id: feature.id, success: false, error: validationError };
    }

    // Compute bounds from parameters
    const bounds = this.computeBounds(feature);

    return { id: feature.id, success: true, bounds };
  }

  /** Validate feature-specific parameter constraints */
  private validateFeatureParams(feature: FeatureNode): string | null {
    const p = feature.parameters;

    switch (feature.type) {
      case 'extrude': {
        const w = p.width as number;
        const h = p.height as number;
        const d = p.depth as number;
        if (w <= 0 || h <= 0 || d <= 0) return 'Dimensions must be positive';
        return null;
      }
      case 'revolve': {
        const r = p.radius as number;
        const h = p.height as number;
        if (r <= 0) return 'Radius must be positive';
        if (h <= 0) return 'Height must be positive';
        return null;
      }
      case 'sphere': {
        if ((p.radius as number) <= 0) return 'Radius must be positive';
        return null;
      }
      case 'cone': {
        if ((p.radius as number) <= 0) return 'Base radius must be positive';
        if ((p.height as number) <= 0) return 'Height must be positive';
        return null;
      }
      case 'torus': {
        if ((p.radius as number) <= 0) return 'Radius must be positive';
        if ((p.tube as number) <= 0) return 'Tube radius must be positive';
        return null;
      }
      case 'fillet': {
        if ((p.radius as number) <= 0) return 'Fillet radius must be positive';
        return null;
      }
      case 'chamfer': {
        if ((p.distance as number) <= 0) return 'Chamfer distance must be positive';
        return null;
      }
      case 'shell': {
        if ((p.thickness as number) <= 0) return 'Wall thickness must be positive';
        return null;
      }
      case 'hole': {
        if ((p.diameter as number) <= 0) return 'Hole diameter must be positive';
        if ((p.depth as number) <= 0) return 'Hole depth must be positive';
        return null;
      }
      case 'pattern_linear': {
        if ((p.count as number) < 1) return 'Count must be at least 1';
        if ((p.spacing as number) <= 0) return 'Spacing must be positive';
        return null;
      }
      case 'pattern_circular': {
        if ((p.count as number) < 1) return 'Count must be at least 1';
        if ((p.angle as number) <= 0) return 'Total angle must be positive';
        return null;
      }
      case 'mirror': {
        return null; // No param validation beyond required featureRef
      }
      case 'boolean_union': {
        const bodyRefs =
          (p.bodyRefs as string)
            ?.split(',')
            .map((s) => s.trim())
            .filter(Boolean) ?? [];
        if (bodyRefs.length < 2) return 'Union requires at least 2 body references';
        return null;
      }
      case 'boolean_subtract': {
        if (!(p.targetRef as string)) return 'Subtract requires a target body reference';
        if (!(p.toolRef as string)) return 'Subtract requires a tool body reference';
        if ((p.targetRef as string) === (p.toolRef as string)) return 'Target and tool must be different bodies';
        return null;
      }
      case 'boolean_intersect': {
        const bodyRefs =
          (p.bodyRefs as string)
            ?.split(',')
            .map((s) => s.trim())
            .filter(Boolean) ?? [];
        if (bodyRefs.length < 2) return 'Intersect requires at least 2 body references';
        return null;
      }
      default:
        return null;
    }
  }

  /** Compute bounding box from feature parameters */
  private computeBounds(feature: FeatureNode): FeatureResult['bounds'] {
    const p = feature.parameters;
    const ox = (p.originX as number) ?? 0;
    const oy = (p.originY as number) ?? 0;
    const oz = (p.originZ as number) ?? 0;

    switch (feature.type) {
      case 'extrude': {
        const w = (p.width as number) / 2;
        const h = (p.height as number) / 2;
        const d = (p.depth as number) / 2;
        return {
          minX: ox - w,
          minY: oy - h,
          minZ: oz - d,
          maxX: ox + w,
          maxY: oy + h,
          maxZ: oz + d,
        };
      }
      case 'revolve': {
        const r = p.radius as number;
        const h = (p.height as number) / 2;
        return {
          minX: ox - r,
          minY: oy - h,
          minZ: oz - r,
          maxX: ox + r,
          maxY: oy + h,
          maxZ: oz + r,
        };
      }
      case 'sphere': {
        const r = p.radius as number;
        return {
          minX: ox - r,
          minY: oy - r,
          minZ: oz - r,
          maxX: ox + r,
          maxY: oy + r,
          maxZ: oz + r,
        };
      }
      case 'cone': {
        const r = p.radius as number;
        const h = p.height as number;
        return {
          minX: ox - r,
          minY: oy,
          minZ: oz - r,
          maxX: ox + r,
          maxY: oy + h,
          maxZ: oz + r,
        };
      }
      case 'torus': {
        const r = p.radius as number;
        const t = p.tube as number;
        const outer = r + t;
        return {
          minX: ox - outer,
          minY: oy - t,
          minZ: oz - outer,
          maxX: ox + outer,
          maxY: oy + t,
          maxZ: oz + outer,
        };
      }
      case 'fillet': {
        const r = p.radius as number;
        return {
          minX: ox - r,
          minY: oy - r,
          minZ: oz - r,
          maxX: ox + r,
          maxY: oy + r,
          maxZ: oz + r,
        };
      }
      case 'chamfer': {
        const d = p.distance as number;
        return {
          minX: ox - d,
          minY: oy - d,
          minZ: oz - d,
          maxX: ox + d,
          maxY: oy + d,
          maxZ: oz + d,
        };
      }
      case 'shell': {
        // Shell bounds are the target body's bounds
        const targetId = p.targetRef as string;
        if (targetId) {
          const targetResult = this.results.get(targetId);
          if (targetResult?.bounds) return targetResult.bounds;
        }
        const t = p.thickness as number;
        return {
          minX: ox - t,
          minY: oy - t,
          minZ: oz - t,
          maxX: ox + t,
          maxY: oy + t,
          maxZ: oz + t,
        };
      }
      case 'hole': {
        const d = (p.diameter as number) / 2;
        const depth = p.depth as number;
        return {
          minX: ox - d,
          minY: oy,
          minZ: oz - d,
          maxX: ox + d,
          maxY: oy + depth,
          maxZ: oz + d,
        };
      }
      case 'pattern_linear': {
        const dir = (p.direction as string) ?? 'x';
        const count = Math.max(1, Math.round((p.count as number) ?? 3));
        const spacing = (p.spacing as number) ?? 5;
        const extent = (count - 1) * spacing;
        return {
          minX: dir === 'x' ? ox : ox - 1,
          minY: dir === 'y' ? oy : oy - 1,
          minZ: dir === 'z' ? oz : oz - 1,
          maxX: dir === 'x' ? ox + extent : ox + 1,
          maxY: dir === 'y' ? oy + extent : oy + 1,
          maxZ: dir === 'z' ? oz + extent : oz + 1,
        };
      }
      case 'pattern_circular': {
        // Circular patterns rotate around origin, so bounds are symmetric
        const r = 1; // approximate extent
        return {
          minX: ox - r,
          minY: oy - r,
          minZ: oz - r,
          maxX: ox + r,
          maxY: oy + r,
          maxZ: oz + r,
        };
      }
      case 'mirror': {
        // Mirror reflects across a plane — symmetric bounds around origin
        return {
          minX: ox - 1,
          minY: oy - 1,
          minZ: oz - 1,
          maxX: ox + 1,
          maxY: oy + 1,
          maxZ: oz + 1,
        };
      }
      case 'boolean_union': {
        // Union bounds are the union of all referenced body bounds
        const bodyRefs =
          (p.bodyRefs as string)
            ?.split(',')
            .map((s) => s.trim())
            .filter(Boolean) ?? [];
        if (bodyRefs.length === 0) return undefined;
        let bounds: FeatureResult['bounds'] | undefined;
        for (const refId of bodyRefs) {
          const refResult = this.results.get(refId);
          if (refResult?.bounds) {
            if (!bounds) {
              bounds = { ...refResult.bounds };
            } else {
              bounds.minX = Math.min(bounds.minX, refResult.bounds.minX);
              bounds.minY = Math.min(bounds.minY, refResult.bounds.minY);
              bounds.minZ = Math.min(bounds.minZ, refResult.bounds.minZ);
              bounds.maxX = Math.max(bounds.maxX, refResult.bounds.maxX);
              bounds.maxY = Math.max(bounds.maxY, refResult.bounds.maxY);
              bounds.maxZ = Math.max(bounds.maxZ, refResult.bounds.maxZ);
            }
          }
        }
        return bounds;
      }
      case 'boolean_subtract': {
        // Subtract bounds are the target body bounds
        const targetRef = p.targetRef as string;
        const targetResult = this.results.get(targetRef);
        return targetResult?.bounds;
      }
      case 'boolean_intersect': {
        // Intersect bounds are the intersection of all body bounds
        const bodyRefs =
          (p.bodyRefs as string)
            ?.split(',')
            .map((s) => s.trim())
            .filter(Boolean) ?? [];
        if (bodyRefs.length === 0) return undefined;
        let bounds: FeatureResult['bounds'] | undefined;
        for (const refId of bodyRefs) {
          const refResult = this.results.get(refId);
          if (refResult?.bounds) {
            if (!bounds) {
              bounds = { ...refResult.bounds };
            } else {
              bounds.minX = Math.max(bounds.minX, refResult.bounds.minX);
              bounds.minY = Math.max(bounds.minY, refResult.bounds.minY);
              bounds.minZ = Math.max(bounds.minZ, refResult.bounds.minZ);
              bounds.maxX = Math.min(bounds.maxX, refResult.bounds.maxX);
              bounds.maxY = Math.min(bounds.maxY, refResult.bounds.maxY);
              bounds.maxZ = Math.min(bounds.maxZ, refResult.bounds.maxZ);
            }
          }
        }
        return bounds;
      }
      default:
        return undefined;
    }
  }

  /** Get the last evaluation result for a feature */
  getResult(id: string): FeatureResult | undefined {
    return this.results.get(id);
  }

  /** Get the dependency graph (for inspection) */
  getGraph(): DependencyGraph {
    return this.graph;
  }

  /** Create a FeatureNode with defaults from the feature registry */
  static createFeature(type: string, index: number, overrides?: Partial<Record<string, unknown>>): FeatureNode | null {
    const def = getFeatureDefinition(type);
    if (!def) return null;

    const defaults = getDefaultParameters(type);
    const params = { ...defaults, ...overrides };

    return {
      id: `${type}-${Date.now()}-${index}`,
      type: type as FeatureNode['type'],
      name: `${def.label} ${index}`,
      parameters: params,
      dependencies: [],
      children: [],
      suppressed: false,
    };
  }
}
