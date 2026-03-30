import { describe, it, expect } from 'vitest';
import { buildSelectionInfo } from './StatusBar';

describe('StatusBar', () => {
  describe('buildSelectionInfo', () => {
    it('should return "none" when nothing selected', () => {
      expect(buildSelectionInfo([], [])).toBe('none');
    });

    it('should show feature name and type for single selection', () => {
      const features = [
        { id: 'abc', name: 'Box 1', type: 'extrude' },
      ];
      expect(buildSelectionInfo(['abc'], features)).toBe('Box 1 (extrude)');
    });

    it('should show count for multiple selections', () => {
      const features = [
        { id: 'a', name: 'Box 1', type: 'extrude' },
        { id: 'b', name: 'Sphere 1', type: 'sphere' },
        { id: 'c', name: 'Cone 1', type: 'cone' },
      ];
      expect(buildSelectionInfo(['a', 'b', 'c'], features)).toBe('3 features');
    });

    it('should fall back to ID when feature not found', () => {
      expect(buildSelectionInfo(['missing'], [])).toBe('missing');
    });

    it('should handle 2 selected features', () => {
      const features = [
        { id: 'a', name: 'A', type: 'extrude' },
        { id: 'b', name: 'B', type: 'sphere' },
      ];
      expect(buildSelectionInfo(['a', 'b'], features)).toBe('2 features');
    });
  });
});
