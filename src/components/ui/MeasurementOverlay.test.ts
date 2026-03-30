import { describe, it, expect } from 'vitest';
import { getFeatureMeasurements } from './MeasurementOverlay';

describe('MeasurementOverlay', () => {
  describe('getFeatureMeasurements', () => {
    it('should compute box measurements (width/height/depth)', () => {
      const m = getFeatureMeasurements({ width: 4, height: 6, depth: 8 });
      expect(m).toHaveLength(4);
      expect(m[0]).toEqual({ label: 'Width', value: 4, unit: 'mm' });
      expect(m[1]).toEqual({ label: 'Height', value: 6, unit: 'mm' });
      expect(m[2]).toEqual({ label: 'Depth', value: 8, unit: 'mm' });
      expect(m[3]).toEqual({ label: 'Volume', value: 192, unit: 'mm\u00B3' });
    });

    it('should compute cylinder measurements (radius + height)', () => {
      const m = getFeatureMeasurements({ radius: 3, height: 10 });
      expect(m).toHaveLength(3);
      expect(m[0]).toEqual({ label: 'Radius', value: 3, unit: 'mm' });
      expect(m[1]).toEqual({ label: 'Diameter', value: 6, unit: 'mm' });
      expect(m[2]).toEqual({ label: 'Height', value: 10, unit: 'mm' });
    });

    it('should compute torus measurements (radius + tube)', () => {
      const m = getFeatureMeasurements({ radius: 2, tube: 0.5 });
      expect(m).toHaveLength(2);
      expect(m[0]).toEqual({ label: 'Major Radius', value: 2, unit: 'mm' });
      expect(m[1]).toEqual({ label: 'Tube Radius', value: 0.5, unit: 'mm' });
    });

    it('should compute sphere measurements (radius only)', () => {
      const m = getFeatureMeasurements({ radius: 5 });
      expect(m).toHaveLength(2);
      expect(m[0]).toEqual({ label: 'Radius', value: 5, unit: 'mm' });
      expect(m[1]).toEqual({ label: 'Diameter', value: 10, unit: 'mm' });
    });

    it('should compute hole measurements (diameter + depth)', () => {
      const m = getFeatureMeasurements({ diameter: 6, depth: 10 });
      expect(m).toHaveLength(2);
      expect(m[0]).toEqual({ label: 'Diameter', value: 6, unit: 'mm' });
      expect(m[1]).toEqual({ label: 'Depth', value: 10, unit: 'mm' });
    });

    it('should include position offset when origin is set', () => {
      const m = getFeatureMeasurements({ width: 2, height: 2, depth: 2, originX: 5, originY: 0, originZ: 3 });
      const posEntry = m.find((x) => x.label === 'Position');
      expect(posEntry).toBeDefined();
      expect(posEntry!.unit).toBe('(5.0, 0.0, 3.0)');
    });

    it('should not include position when origin is default', () => {
      const m = getFeatureMeasurements({ width: 2, height: 2, depth: 2 });
      const posEntry = m.find((x) => x.label === 'Position');
      expect(posEntry).toBeUndefined();
    });

    it('should return empty for unknown parameter shapes', () => {
      const m = getFeatureMeasurements({ foo: 'bar' });
      expect(m).toEqual([]);
    });

    it('should handle zero dimensions', () => {
      const m = getFeatureMeasurements({ width: 0, height: 0, depth: 0 });
      expect(m[3]!.value).toBe(0); // Volume = 0
    });
  });
});
