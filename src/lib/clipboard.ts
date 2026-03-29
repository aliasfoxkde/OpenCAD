/**
 * Module-level clipboard for feature copy/paste/cut operations.
 *
 * Stores serialized FeatureNode snapshots. Paste creates new features
 * with fresh IDs and "(copy)" appended to names.
 */

import type { FeatureNode } from '../types/cad';

let clipboardFeatures: FeatureNode[] = [];

export function copyFeatures(features: FeatureNode[]): void {
  clipboardFeatures = features.map((f) => structuredClone(f));
}

export function pasteFeatures(): FeatureNode[] {
  if (clipboardFeatures.length === 0) return [];
  return clipboardFeatures.map((f) => ({
    ...structuredClone(f),
    id: crypto.randomUUID(),
    name: f.name.includes('(copy)') ? f.name : `${f.name} (copy)`,
  }));
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
