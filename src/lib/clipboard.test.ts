import { describe, it, expect, beforeEach } from 'vitest';
import { copyFeatures, pasteFeatures, cutFeatures, hasClipboardContent, clearClipboard } from './clipboard';
import type { FeatureNode } from '../types/cad';

const makeFeature = (id: string, name: string): FeatureNode => ({
  id,
  type: 'extrude',
  name,
  parameters: { width: 10 },
  dependencies: [],
  children: [],
  suppressed: false,
});

describe('clipboard', () => {
  beforeEach(() => {
    clearClipboard();
  });

  it('starts empty', () => {
    expect(hasClipboardContent()).toBe(false);
  });

  it('copies and returns new features on paste', () => {
    const features = [makeFeature('a', 'Box 1'), makeFeature('b', 'Cylinder 2')];
    copyFeatures(features);

    expect(hasClipboardContent()).toBe(true);

    const pasted = pasteFeatures();
    expect(pasted).toHaveLength(2);
    expect(pasted[0]!.id).not.toBe('a');
    expect(pasted[0]!.name).toBe('Box 1 (copy)');
    expect(pasted[0]!.parameters).toEqual({ width: 10 });
    expect(pasted[1]!.id).not.toBe('b');
    expect(pasted[1]!.name).toBe('Cylinder 2 (copy)');
  });

  it('does not double-append "(copy)" on re-paste', () => {
    const features = [makeFeature('a', 'Box 1 (copy)')];
    copyFeatures(features);

    const pasted = pasteFeatures();
    expect(pasted[0]!.name).toBe('Box 1 (copy)');
  });

  it('deep clones so original is unaffected', () => {
    const features = [makeFeature('a', 'Box 1')];
    copyFeatures(features);
    features[0]!.parameters.width = 999;

    const pasted = pasteFeatures();
    expect(pasted[0]!.parameters.width).toBe(10);
  });

  it('cut copies then returns IDs to remove', () => {
    const features = [makeFeature('a', 'Box 1'), makeFeature('b', 'Cyl 2')];
    const idsToRemove = cutFeatures(features);

    expect(hasClipboardContent()).toBe(true);
    expect(idsToRemove).toEqual(['a', 'b']);

    const pasted = pasteFeatures();
    expect(pasted[0]!.name).toBe('Box 1 (copy)');
  });

  it('clearClipboard empties clipboard', () => {
    copyFeatures([makeFeature('a', 'Box 1')]);
    expect(hasClipboardContent()).toBe(true);

    clearClipboard();
    expect(hasClipboardContent()).toBe(false);
    expect(pasteFeatures()).toHaveLength(0);
  });
});
