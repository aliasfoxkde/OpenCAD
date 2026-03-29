import { describe, it, expect, beforeEach } from 'vitest';
import {
  pushState,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  resetUndoHistory,
} from './undo-history';
import type { FeatureNode } from '../types/cad';

const makeFeature = (id: string): FeatureNode => ({
  id,
  type: 'extrude',
  name: `Feature ${id}`,
  parameters: { width: 1 },
  dependencies: [],
  children: [],
  suppressed: false,
});

describe('undo-history', () => {
  beforeEach(() => {
    resetUndoHistory();
  });

  it('should start with empty history', () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('should push state and allow undo', () => {
    const current: FeatureNode[] = []; // state before mutation
    const afterMutation = [makeFeature('a')];

    pushState(current); // save pre-mutation state

    expect(canUndo()).toBe(true);
    expect(canRedo()).toBe(false);

    const prev = undo(afterMutation);
    expect(prev).toEqual(current); // returns the saved pre-mutation state
    expect(canUndo()).toBe(false);
  });

  it('should allow redo after undo', () => {
    const before: FeatureNode[] = [];
    const after = [makeFeature('a')];

    pushState(before); // save pre-mutation state

    const undone = undo(after);
    expect(undone).toEqual(before);
    expect(canRedo()).toBe(true);

    const next = redo(undone!);
    expect(next).toEqual(after);
    expect(canRedo()).toBe(false);
  });

  it('should clear future on new push', () => {
    const f1 = [makeFeature('a')];
    const f2 = [makeFeature('b')];

    pushState(f1);
    pushState(f2);
    undo(f2);
    expect(canRedo()).toBe(true);

    // Pushing new state clears future
    pushState([makeFeature('c')]);
    expect(canRedo()).toBe(false);
  });

  it('should enforce max history depth of 50', () => {
    for (let i = 0; i < 55; i++) {
      pushState([makeFeature(`f${i}`)]);
    }
    expect(canUndo()).toBe(true);
    // Only 50 entries should be kept — undo all to check
    const allUndone: FeatureNode[][] = [];
    let current: FeatureNode[] = [];
    while (canUndo()) {
      const result = undo(current);
      if (result) {
        allUndone.push(result);
        current = result;
      }
    }
    expect(allUndone).toHaveLength(50);
    // First popped (index 0) is the most recent entry
    expect(allUndone[0]![0]!.id).toBe('f54');
    // Last popped (index 49) is the oldest surviving entry
    expect(allUndone[49]![0]!.id).toBe('f5'); // f0-f4 evicted
  });

  it('should deep clone features (isolation)', () => {
    const features = [makeFeature('a')];
    pushState(features);

    // Mutate original — should not affect history
    features[0]!.name = 'mutated';

    const prev = undo(features) as FeatureNode[];
    expect(prev![0]!.name).toBe('Feature a');
  });

  it('should return null when undoing with empty past', () => {
    expect(undo([makeFeature('a')])).toBeNull();
  });

  it('should return null when redoing with empty future', () => {
    expect(redo([makeFeature('a')])).toBeNull();
  });

  it('should clear all history', () => {
    pushState([makeFeature('a')]);
    pushState([makeFeature('b')]);
    expect(canUndo()).toBe(true);

    clearHistory();
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it('should support full undo/redo cycle', () => {
    const f1 = [makeFeature('1')];
    const f2 = [makeFeature('1'), makeFeature('2')];
    const f3 = [makeFeature('1'), makeFeature('2'), makeFeature('3')];

    pushState(f1);
    pushState(f2);

    // Undo back to f1
    const r1 = undo(f3);
    expect(r1).toEqual(f2);

    const r2 = undo(r1!);
    expect(r2).toEqual(f1);

    // Redo forward
    const r3 = redo(r2!);
    expect(r3).toEqual(f2);

    const r4 = redo(r3!);
    expect(r4).toEqual(f3);

    expect(canRedo()).toBe(false);
  });
});
