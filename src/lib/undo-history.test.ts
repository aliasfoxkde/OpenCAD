import { describe, it, expect, beforeEach } from 'vitest';
import { pushState, undo, redo, canUndo, canRedo, clearHistory, resetUndoHistory } from './undo-history';
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
    const current: FeatureNode[] = [];
    const afterMutation = [makeFeature('a')];

    pushState(current);

    expect(canUndo()).toBe(true);
    expect(canRedo()).toBe(false);

    const prev = undo(afterMutation);
    expect(prev?.features).toEqual(current);
    expect(canUndo()).toBe(false);
  });

  it('should allow redo after undo', () => {
    const before: FeatureNode[] = [];
    const after = [makeFeature('a')];

    pushState(before);

    const undone = undo(after);
    expect(undone?.features).toEqual(before);
    expect(canRedo()).toBe(true);

    const next = redo(undone!.features, undone!.selectedIds);
    expect(next?.features).toEqual(after);
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
    const allUndone: FeatureNode[][] = [];
    let current: FeatureNode[] = [];
    while (canUndo()) {
      const result = undo(current, []);
      if (result) {
        allUndone.push(result.features);
        current = result.features;
      }
    }
    expect(allUndone).toHaveLength(50);
    expect(allUndone[0]![0]!.id).toBe('f54');
    expect(allUndone[49]![0]!.id).toBe('f5');
  });

  it('should deep clone features (isolation)', () => {
    const features = [makeFeature('a')];
    pushState(features);

    features[0]!.name = 'mutated';

    const prev = undo(features, [])!;
    expect(prev.features[0]!.name).toBe('Feature a');
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

    const r1 = undo(f3, []);
    expect(r1?.features).toEqual(f2);

    const r2 = undo(r1!.features, r1!.selectedIds);
    expect(r2?.features).toEqual(f1);

    const r3 = redo(r2!.features, r2!.selectedIds);
    expect(r3?.features).toEqual(f2);

    const r4 = redo(r3!.features, r3!.selectedIds);
    expect(r4?.features).toEqual(f3);

    expect(canRedo()).toBe(false);
  });

  describe('selection tracking', () => {
    it('should save selectedIds in history entry', () => {
      pushState([makeFeature('a')], ['a']);
      const result = undo([makeFeature('a'), makeFeature('b')]);
      expect(result?.selectedIds).toEqual(['a']);
    });

    it('should save current selectedIds on undo', () => {
      pushState([makeFeature('a')]);
      const result = undo([makeFeature('b')], ['b']);
      expect(canRedo()).toBe(true);
      const redone = redo(result!.features, result!.selectedIds);
      expect(redone?.selectedIds).toEqual(['b']);
    });

    it('should handle empty selectedIds', () => {
      pushState([makeFeature('a')]);
      const result = undo([makeFeature('a')]);
      expect(result?.selectedIds).toEqual([]);
    });

    it('should isolate selectedIds arrays (no aliasing)', () => {
      const sel = ['a', 'b'];
      pushState([makeFeature('a')], sel);
      sel.push('c'); // mutate original
      const result = undo([makeFeature('a')]);
      expect(result?.selectedIds).toEqual(['a', 'b']); // not ['a', 'b', 'c']
    });
  });
});
