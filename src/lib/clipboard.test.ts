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

  describe('dependency remapping on paste', () => {
    it('remaps dependency arrays between pasted features', () => {
      const features: FeatureNode[] = [
        makeFeature('a', 'Body A'),
        { ...makeFeature('b', 'Body B'), dependencies: ['a'] },
      ];
      copyFeatures(features);
      const pasted = pasteFeatures();

      expect(pasted[1]!.dependencies).toEqual([pasted[0]!.id]);
      expect(pasted[1]!.dependencies[0]).not.toBe('a');
    });

    it('removes dependencies pointing to features not in clipboard', () => {
      const features: FeatureNode[] = [
        makeFeature('a', 'Body A'),
        { ...makeFeature('b', 'Body B'), dependencies: ['a', 'external'] },
      ];
      copyFeatures(features);
      const pasted = pasteFeatures();

      expect(pasted[1]!.dependencies).toEqual([pasted[0]!.id]);
    });

    it('remaps targetRef parameter for boolean features', () => {
      const features: FeatureNode[] = [
        makeFeature('a', 'Target'),
        makeFeature('b', 'Tool'),
        { ...makeFeature('c', 'Subtract'), type: 'boolean_subtract',
          parameters: { targetRef: 'a', toolRef: 'b' },
          dependencies: ['a', 'b'] },
      ];
      copyFeatures(features);
      const pasted = pasteFeatures();

      const sub = pasted.find((f) => f.name === 'Subtract (copy)')!;
      expect(sub!.parameters.targetRef).toBe(pasted[0]!.id);
      expect(sub!.parameters.toolRef).toBe(pasted[1]!.id);
    });

    it('clears targetRef when referencing feature not in clipboard', () => {
      const features: FeatureNode[] = [
        makeFeature('a', 'Target'),
        makeFeature('b', 'Tool'),
        { ...makeFeature('c', 'Subtract'), type: 'boolean_subtract',
          parameters: { targetRef: 'a', toolRef: 'external' },
          dependencies: ['a', 'external'] },
      ];
      copyFeatures(features);
      const pasted = pasteFeatures();

      const sub = pasted.find((f) => f.name === 'Subtract (copy)')!;
      expect(sub!.parameters.targetRef).toBe(pasted[0]!.id);
      expect(sub!.parameters.toolRef).toBe('');
    });

    it('remaps bodyRefs comma-separated parameter', () => {
      const features: FeatureNode[] = [
        makeFeature('a', 'A'),
        makeFeature('b', 'B'),
        { ...makeFeature('c', 'Union'), type: 'boolean_union',
          parameters: { bodyRefs: 'a, b' },
          dependencies: ['a', 'b'] },
      ];
      copyFeatures(features);
      const pasted = pasteFeatures();

      const union = pasted.find((f) => f.name === 'Union (copy)')!;
      const refs = (union!.parameters.bodyRefs as string).split(',').map((s) => s.trim());
      expect(refs).toContain(pasted[0]!.id);
      expect(refs).toContain(pasted[1]!.id);
      expect(refs).not.toContain('a');
    });

    it('remaps featureRef parameter for pattern features', () => {
      const features: FeatureNode[] = [
        makeFeature('a', 'Base'),
        { ...makeFeature('b', 'Pattern'), type: 'pattern_linear',
          parameters: { featureRef: 'a', count: 3, direction: 'x', spacing: 5 },
          dependencies: ['a'] },
      ];
      copyFeatures(features);
      const pasted = pasteFeatures();

      const pat = pasted.find((f) => f.name === 'Pattern (copy)')!;
      expect(pat!.parameters.featureRef).toBe(pasted[0]!.id);
    });
  });
});
