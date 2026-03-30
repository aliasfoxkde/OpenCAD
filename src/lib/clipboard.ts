/**
 * Module-level clipboard for feature copy/paste/cut operations.
 *
 * Stores serialized FeatureNode snapshots. Paste creates new features
 * with fresh IDs and "(copy)" appended to names. Dependency IDs
 * are remapped to the new pasted feature IDs where possible.
 */

import type { FeatureNode } from '../types/cad';

let clipboardFeatures: FeatureNode[] = [];

export function copyFeatures(features: FeatureNode[]): void {
  clipboardFeatures = features.map((f) => structuredClone(f));
}

export function pasteFeatures(): FeatureNode[] {
  if (clipboardFeatures.length === 0) return [];

  // Build old→new ID mapping
  const idMap = new Map<string, string>();
  const pasted: FeatureNode[] = [];

  for (const f of clipboardFeatures) {
    const newId = crypto.randomUUID();
    idMap.set(f.id, newId);

    pasted.push({
      ...structuredClone(f),
      id: newId,
      name: f.name.includes('(copy)') ? f.name : `${f.name} (copy)`,
      // Dependencies are remapped below from the cloned originals
      parameters: { ...f.parameters },
    });
  }

  // Remap dependency arrays and reference parameters
  for (const f of pasted) {
    f.dependencies = f.dependencies
      .filter((depId) => idMap.has(depId)) // only keep refs to pasted features
      .map((depId) => idMap.get(depId)!); // remap to new IDs

    // Remap reference parameters (targetRef, toolRef, featureRef, bodyRefs)
    const refParams = ['targetRef', 'toolRef', 'featureRef'] as const;
    for (const param of refParams) {
      const val = f.parameters[param] as string | undefined;
      if (val && idMap.has(val)) {
        f.parameters[param] = idMap.get(val);
      } else if (val && !idMap.has(val)) {
        // Reference points to feature not in clipboard — clear it
        f.parameters[param] = '';
      }
    }

    // Remap comma-separated bodyRefs
    const bodyRefs = f.parameters.bodyRefs as string | undefined;
    if (bodyRefs) {
      const refs = bodyRefs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const remapped = refs.filter((refId) => idMap.has(refId)).map((refId) => idMap.get(refId)!);
      f.parameters.bodyRefs = remapped.join(',');
    }
  }

  return pasted;
}

export function cutFeatures(features: FeatureNode[]): string[] {
  copyFeatures(features);
  return features.map((f) => f.id);
}

export function hasClipboardContent(): boolean {
  return clipboardFeatures.length > 0;
}

export function clearClipboard(): void {
  clipboardFeatures = [];
}
