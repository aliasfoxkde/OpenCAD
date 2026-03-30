import type { FeatureNode } from '../types/cad';

const MAX_HISTORY = 50;

interface HistoryEntry {
  features: FeatureNode[];
  selectedIds: string[];
}

let past: HistoryEntry[] = [];
let future: HistoryEntry[] = [];

/** Snapshot current features + selection before a mutation */
export function pushState(features: FeatureNode[], selectedIds: string[] = []): void {
  past.push({ features: structuredClone(features), selectedIds: [...selectedIds] });
  if (past.length > MAX_HISTORY) {
    past.shift();
  }
  future = [];
}

/** Undo: pop from past, push current to future, return previous state */
export function undo(currentFeatures: FeatureNode[], currentSelectedIds: string[] = []): HistoryEntry | null {
  if (past.length === 0) return null;
  future.push({ features: structuredClone(currentFeatures), selectedIds: [...currentSelectedIds] });
  return past.pop()!;
}

/** Redo: pop from future, push current to past, return next state */
export function redo(currentFeatures: FeatureNode[], currentSelectedIds: string[] = []): HistoryEntry | null {
  if (future.length === 0) return null;
  past.push({ features: structuredClone(currentFeatures), selectedIds: [...currentSelectedIds] });
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
