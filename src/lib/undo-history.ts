import type { FeatureNode } from '../types/cad';

const MAX_HISTORY = 50;

let past: FeatureNode[][] = [];
let future: FeatureNode[][] = [];

/** Snapshot current features before a mutation */
export function pushState(features: FeatureNode[]): void {
  past.push(structuredClone(features));
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  future = [];
}

/** Undo: pop from past, push current to future, return previous state */
export function undo(currentFeatures: FeatureNode[]): FeatureNode[] | null {
  if (past.length === 0) return null;
  future.push(structuredClone(currentFeatures));
  return past.pop()!;
}

/** Redo: pop from future, push current to past, return next state */
export function redo(currentFeatures: FeatureNode[]): FeatureNode[] | null {
  if (future.length === 0) return null;
  past.push(structuredClone(currentFeatures));
  return future.pop()!;
}

export function canUndo(): boolean {
  return past.length > 0;
}

export function canRedo(): boolean {
  return future.length > 0;
}

export function clearHistory(): void {
  past = [];
  future = [];
}

export function getUndoRedoState(): { canUndo: boolean; canRedo: boolean } {
  return { canUndo: canUndo(), canRedo: canRedo() };
}

/** Reset history (for testing) */
export function resetUndoHistory(): void {
  clearHistory();
}
