import { describe, it, expect } from 'vitest';
import { findSnap, getSnapPoints, snapToGrid, distance } from './snap-engine';
import type { SketchElement } from '../../types/cad';

describe('SnapEngine', () => {
  describe('distance', () => {
    it('should compute distance between two points', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(distance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
    });
  });

  describe('snapToGrid', () => {
    it('should snap to nearest grid point', () => {
      expect(snapToGrid({ x: 3, y: 7 }, 5)).toEqual({ x: 5, y: 5 });
      expect(snapToGrid({ x: 2, y: 3 }, 5)).toEqual({ x: 0, y: 5 });
      expect(snapToGrid({ x: 12, y: 8 }, 10)).toEqual({ x: 10, y: 10 });
    });

    it('should stay on grid if already on it', () => {
      expect(snapToGrid({ x: 10, y: 20 }, 10)).toEqual({ x: 10, y: 20 });
    });
  });

  describe('getSnapPoints', () => {
    it('should return endpoints and midpoint for a line', () => {
      const line: SketchElement = {
        id: 'l1', type: 'line',
        geometry: { x1: 0, y1: 0, x2: 10, y2: 0 },
        construction: false,
      };
      const points = getSnapPoints(line);
      expect(points).toHaveLength(3);
      expect(points.find((p) => p.type === 'endpoint' && p.point.x === 0 && p.point.y === 0)).toBeDefined();
      expect(points.find((p) => p.type === 'endpoint' && p.point.x === 10 && p.point.y === 0)).toBeDefined();
      expect(points.find((p) => p.type === 'midpoint' && p.point.x === 5 && p.point.y === 0)).toBeDefined();
    });

    it('should return center and cardinal points for a circle', () => {
      const circle: SketchElement = {
        id: 'c1', type: 'circle',
        geometry: { cx: 5, cy: 5, r: 3 },
        construction: false,
      };
      const points = getSnapPoints(circle);
      expect(points.length).toBeGreaterThanOrEqual(5);
      expect(points.find((p) => p.type === 'center' && p.point.x === 5 && p.point.y === 5)).toBeDefined();
      expect(points.find((p) => p.point.x === 8 && p.point.y === 5)).toBeDefined();
    });

    it('should return corners and midpoints for a rectangle', () => {
      const rect: SketchElement = {
        id: 'r1', type: 'rectangle',
        geometry: { x: 0, y: 0, width: 10, height: 5 },
        construction: false,
      };
      const points = getSnapPoints(rect);
      // 4 corners + 4 midpoints + 1 center = 9
      expect(points).toHaveLength(9);
      expect(points.find((p) => p.type === 'center' && p.point.x === 5 && p.point.y === 2.5)).toBeDefined();
    });

    it('should return endpoint for a point element', () => {
      const point: SketchElement = {
        id: 'p1', type: 'point',
        geometry: { x: 3, y: 7 },
        construction: false,
      };
      const points = getSnapPoints(point);
      expect(points).toHaveLength(1);
      expect(points[0]!.point).toEqual({ x: 3, y: 7 });
    });

    it('should return endpoints for an arc', () => {
      const arc: SketchElement = {
        id: 'a1', type: 'arc',
        geometry: { x1: 0, y1: 0, x2: 5, y2: 5, x3: 10, y3: 0 },
        construction: false,
      };
      const points = getSnapPoints(arc);
      expect(points.length).toBeGreaterThanOrEqual(2);
      expect(points.find((p) => p.point.x === 0 && p.point.y === 0)).toBeDefined();
      expect(points.find((p) => p.point.x === 10 && p.point.y === 0)).toBeDefined();
    });
  });

  describe('findSnap', () => {
    it('should find nearest endpoint snap', () => {
      const elements: SketchElement[] = [
        { id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false },
      ];

      const result = findSnap({
        elements,
        cursor: { x: 1, y: 1 },
        snapDistance: 8,
        gridSize: 1,
        gridEnabled: true,
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe('endpoint');
      expect(result!.point.x).toBe(0);
      expect(result!.point.y).toBe(0);
    });

    it('should fall back to grid snap', () => {
      const result = findSnap({
        elements: [],
        cursor: { x: 3, y: 7 },
        snapDistance: 8,
        gridSize: 5,
        gridEnabled: true,
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe('grid');
    });

    it('should return null when nothing is close', () => {
      const result = findSnap({
        elements: [],
        cursor: { x: 3, y: 7 },
        snapDistance: 0.1,
        gridSize: 100,
        gridEnabled: false,
      });

      expect(result).toBeNull();
    });

    it('should prefer element snaps over grid snaps', () => {
      const elements: SketchElement[] = [
        { id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false },
      ];

      const result = findSnap({
        elements,
        cursor: { x: 0.5, y: 0.5 },
        snapDistance: 8,
        gridSize: 10,
        gridEnabled: true,
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe('endpoint');
    });
  });
});
