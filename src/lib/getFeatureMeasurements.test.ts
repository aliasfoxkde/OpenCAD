import { describe, it, expect } from 'vitest';
import { getFeatureMeasurements } from '@/components/ui/MeasurementOverlay';

describe('getFeatureMeasurements', () => {
  it('should return empty array for unknown params', () => {
    expect(getFeatureMeasurements({})).toEqual([]);
  });

  it('should return empty array for params with no recognized keys', () => {
    expect(getFeatureMeasurements({ foo: 10, bar: 20 })).toEqual([]);
  });

  describe('cuboid (width, height, depth)', () => {
    it('should return width, height, depth, and volume', () => {
      const result = getFeatureMeasurements({ width: 10, height: 20, depth: 30 });
      expect(result).toHaveLength(4);
      expect(result).toEqual(
        expect.arrayContaining([
          { label: 'Width', value: 10, unit: 'mm' },
          { label: 'Height', value: 20, unit: 'mm' },
          { label: 'Depth', value: 30, unit: 'mm' },
          { label: 'Volume', value: 6000, unit: 'mm\u00B3' },
        ]),
      );
    });

    it('should handle zero dimensions', () => {
      const result = getFeatureMeasurements({ width: 0, height: 0, depth: 0 });
      expect(result).toHaveLength(4);
      expect(result.find((m) => m.label === 'Volume')!.value).toBe(0);
    });

    it('should handle fractional dimensions', () => {
      const result = getFeatureMeasurements({ width: 2.5, height: 3.5, depth: 4.5 });
      const volume = result.find((m) => m.label === 'Volume')!;
      expect(volume.value).toBeCloseTo(39.375, 6);
    });
  });

  describe('cylinder (radius + height)', () => {
    it('should return radius, diameter, and height', () => {
      const result = getFeatureMeasurements({ radius: 5, height: 10 });
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          { label: 'Radius', value: 5, unit: 'mm' },
          { label: 'Diameter', value: 10, unit: 'mm' },
          { label: 'Height', value: 10, unit: 'mm' },
        ]),
      );
    });

    it('should omit height when it is zero', () => {
      const result = getFeatureMeasurements({ radius: 5, height: 0 });
      expect(result).toHaveLength(2);
      expect(result.find((m) => m.label === 'Height')).toBeUndefined();
    });
  });

  describe('torus (radius + tube)', () => {
    it('should return major radius and tube radius', () => {
      const result = getFeatureMeasurements({ radius: 8, tube: 2 });
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { label: 'Major Radius', value: 8, unit: 'mm' },
          { label: 'Tube Radius', value: 2, unit: 'mm' },
        ]),
      );
    });
  });

  describe('sphere (radius only)', () => {
    it('should return radius and diameter', () => {
      const result = getFeatureMeasurements({ radius: 7 });
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { label: 'Radius', value: 7, unit: 'mm' },
          { label: 'Diameter', value: 14, unit: 'mm' },
        ]),
      );
    });
  });

  describe('hole (diameter + depth)', () => {
    it('should return diameter and depth', () => {
      const result = getFeatureMeasurements({ diameter: 12, depth: 5 });
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { label: 'Diameter', value: 12, unit: 'mm' },
          { label: 'Depth', value: 5, unit: 'mm' },
        ]),
      );
    });
  });

  describe('position info', () => {
    it('should not add position when all origins are zero', () => {
      const result = getFeatureMeasurements({ width: 10, height: 10, depth: 10, originX: 0, originY: 0, originZ: 0 });
      expect(result.find((m) => m.label === 'Position')).toBeUndefined();
    });

    it('should add position when originX is non-zero', () => {
      const result = getFeatureMeasurements({ width: 10, height: 10, depth: 10, originX: 5, originY: 0, originZ: 0 });
      const pos = result.find((m) => m.label === 'Position');
      expect(pos).toBeDefined();
      expect(pos!.unit).toContain('5.0');
    });

    it('should add position when all origins are non-zero', () => {
      const result = getFeatureMeasurements({ width: 10, height: 10, depth: 10, originX: 1.5, originY: -2.5, originZ: 3 });
      const pos = result.find((m) => m.label === 'Position');
      expect(pos).toBeDefined();
      expect(pos!.unit).toBe('(1.5, -2.5, 3.0)');
    });

    it('should add position for features without shape measurements', () => {
      const result = getFeatureMeasurements({ originX: 10, originY: 20, originZ: 30 });
      expect(result).toHaveLength(1);
      expect(result[0]!.label).toBe('Position');
      expect(result[0]!.unit).toBe('(10.0, 20.0, 30.0)');
    });
  });
});
