import { describe, it, expect } from 'vitest';
import {
  createDistanceAnnotation,
  createRadiusAnnotation,
  createDiameterAnnotation,
  getAnnotationLabel,
  getAnnotationMidpoint,
} from './annotations';

describe('annotations', () => {
  describe('createDistanceAnnotation', () => {
    it('creates annotation with type distance', () => {
      const ann = createDistanceAnnotation([0, 0, 0], [3, 0, 0]);
      expect(ann.type).toBe('distance');
      expect(ann.p1).toEqual([0, 0, 0]);
      expect(ann.p2).toEqual([3, 0, 0]);
      expect(ann.id).toBeDefined();
    });

    it('generates unique IDs', () => {
      const a = createDistanceAnnotation([0, 0, 0], [1, 0, 0]);
      const b = createDistanceAnnotation([0, 0, 0], [1, 0, 0]);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('createRadiusAnnotation', () => {
    it('creates annotation with type radius', () => {
      const ann = createRadiusAnnotation([0, 0, 0], [2, 0, 0]);
      expect(ann.type).toBe('radius');
      expect(ann.p1).toEqual([0, 0, 0]);
      expect(ann.p2).toEqual([2, 0, 0]);
    });
  });

  describe('createDiameterAnnotation', () => {
    it('creates annotation with type diameter', () => {
      const ann = createDiameterAnnotation([0, 0, 0], [3, 0, 0]);
      expect(ann.type).toBe('diameter');
    });
  });

  describe('getAnnotationLabel', () => {
    it('formats distance annotation', () => {
      const ann = createDistanceAnnotation([0, 0, 0], [3, 4, 0]);
      // sqrt(9 + 16) = 5
      expect(getAnnotationLabel(ann)).toBe('5.00 mm');
    });

    it('formats radius annotation', () => {
      const ann = createRadiusAnnotation([0, 0, 0], [2.5, 0, 0]);
      expect(getAnnotationLabel(ann)).toBe('R2.50');
    });

    it('formats diameter annotation', () => {
      const ann = createDiameterAnnotation([0, 0, 0], [2.5, 0, 0]);
      // radius = 2.5, diameter = 5.0
      expect(getAnnotationLabel(ann)).toBe('\u00D85.00');
    });

    it('uses custom label when provided', () => {
      const ann = createDistanceAnnotation([0, 0, 0], [1, 0, 0]);
      ann.label = 'Custom';
      expect(getAnnotationLabel(ann)).toBe('Custom');
    });

    it('formats small distances with 3 decimals', () => {
      const ann = createDistanceAnnotation([0, 0, 0], [0.05, 0, 0]);
      expect(getAnnotationLabel(ann)).toBe('0.050 mm');
    });

    it('formats large distances with 1 decimal', () => {
      const ann = createDistanceAnnotation([0, 0, 0], [100, 0, 0]);
      expect(getAnnotationLabel(ann)).toBe('100.0 mm');
    });

    it('formats zero distance', () => {
      const ann = createDistanceAnnotation([5, 5, 5], [5, 5, 5]);
      expect(getAnnotationLabel(ann)).toBe('0 mm');
    });
  });

  describe('getAnnotationMidpoint', () => {
    it('computes midpoint of two points', () => {
      const ann = createDistanceAnnotation([0, 0, 0], [4, 6, 8]);
      const mid = getAnnotationMidpoint(ann);
      expect(mid).toEqual([2, 3, 4]);
    });

    it('computes midpoint for negative coordinates', () => {
      const ann = createDistanceAnnotation([-2, -4, 0], [2, 4, 0]);
      const mid = getAnnotationMidpoint(ann);
      expect(mid).toEqual([0, 0, 0]);
    });
  });
});
