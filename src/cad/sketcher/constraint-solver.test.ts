import { describe, it, expect } from 'vitest';
import { solveConstraints } from './constraint-solver';
import type { SketchElement, SketchConstraint } from '../../types/cad';

describe('ConstraintSolver', () => {
  describe('solveConstraints', () => {
    it('should return success with no constraints', () => {
      const elements: SketchElement[] = [
        { id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false },
      ];
      const result = solveConstraints(elements, []);
      expect(result.success).toBe(true);
      expect(result.iterations).toBe(0);
      expect(result.residual).toBe(0);
    });

    it('should solve coincident constraint', () => {
      const p1: SketchElement = {
        id: 'p1', type: 'point', geometry: { x: 5, y: 5 }, construction: false,
      };
      const p2: SketchElement = {
        id: 'p2', type: 'point', geometry: { x: 10, y: 10 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'coincident', elements: ['p1', 'p2'] },
      ];

      const result = solveConstraints([p1, p2], constraints);
      expect(result.success).toBe(true);
      // After solving, p1 and p2 should coincide
      const x1 = result.variables.get('p1.x') ?? 0;
      const y1 = result.variables.get('p1.y') ?? 0;
      const x2 = result.variables.get('p2.x') ?? 0;
      const y2 = result.variables.get('p2.y') ?? 0;
      expect(Math.abs(x1 - x2)).toBeLessThan(1e-4);
      expect(Math.abs(y1 - y2)).toBeLessThan(1e-4);
    });

    it('should solve horizontal constraint', () => {
      const line: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 5, x2: 10, y2: 3 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'horizontal', elements: ['l1'] },
      ];

      const result = solveConstraints([line], constraints);
      expect(result.success).toBe(true);
      const y1 = result.variables.get('l1.y1') ?? 0;
      const y2 = result.variables.get('l1.y2') ?? 0;
      expect(Math.abs(y1 - y2)).toBeLessThan(1e-4);
    });

    it('should solve vertical constraint', () => {
      const line: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 5, y1: 0, x2: 3, y2: 10 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'vertical', elements: ['l1'] },
      ];

      const result = solveConstraints([line], constraints);
      expect(result.success).toBe(true);
      const x1 = result.variables.get('l1.x1') ?? 0;
      const x2 = result.variables.get('l1.x2') ?? 0;
      expect(Math.abs(x1 - x2)).toBeLessThan(1e-4);
    });

    it('should solve distance constraint between two points', () => {
      const p1: SketchElement = {
        id: 'p1', type: 'point', geometry: { x: 0, y: 0 }, construction: false,
      };
      const p2: SketchElement = {
        id: 'p2', type: 'point', geometry: { x: 3, y: 4 }, construction: false,
      };
      // Initial distance is 5, constrain to 10
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'distance', elements: ['p1', 'p2'], value: 10 },
      ];

      const result = solveConstraints([p1, p2], constraints);
      expect(result.success).toBe(true);
      const x1 = result.variables.get('p1.x') ?? 0;
      const y1 = result.variables.get('p1.y') ?? 0;
      const x2 = result.variables.get('p2.x') ?? 0;
      const y2 = result.variables.get('p2.y') ?? 0;
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      expect(Math.abs(dist - 10)).toBeLessThan(0.5);
    });

    it('should solve equal length constraint for two lines', () => {
      const l1: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false,
      };
      const l2: SketchElement = {
        id: 'l2', type: 'line', geometry: { x1: 0, y1: 5, x2: 6, y2: 5 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'equal', elements: ['l1', 'l2'] },
      ];

      const result = solveConstraints([l1, l2], constraints);
      expect(result.success).toBe(true);

      const dx1 = (result.variables.get('l1.x2') ?? 0) - (result.variables.get('l1.x1') ?? 0);
      const dy1 = (result.variables.get('l1.y2') ?? 0) - (result.variables.get('l1.y1') ?? 0);
      const dx2 = (result.variables.get('l2.x2') ?? 0) - (result.variables.get('l2.x1') ?? 0);
      const dy2 = (result.variables.get('l2.y2') ?? 0) - (result.variables.get('l2.y1') ?? 0);
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      expect(Math.abs(len1 - len2)).toBeLessThan(0.1);
    });

    it('should solve equal radius constraint for two circles', () => {
      const c1: SketchElement = {
        id: 'c1', type: 'circle', geometry: { cx: 0, cy: 0, r: 5 }, construction: false,
      };
      const c2: SketchElement = {
        id: 'c2', type: 'circle', geometry: { cx: 10, cy: 0, r: 3 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'equal', elements: ['c1', 'c2'] },
      ];

      const result = solveConstraints([c1, c2], constraints);
      expect(result.success).toBe(true);
      const r1 = result.variables.get('c1.r') ?? 0;
      const r2 = result.variables.get('c2.r') ?? 0;
      expect(Math.abs(r1 - r2)).toBeLessThan(1e-4);
    });

    it('should solve parallel constraint', () => {
      const l1: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false,
      };
      const l2: SketchElement = {
        id: 'l2', type: 'line', geometry: { x1: 0, y1: 5, x2: 6, y2: 3 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'parallel', elements: ['l1', 'l2'] },
      ];

      const result = solveConstraints([l1, l2], constraints);
      expect(result.success).toBe(true);

      // Cross product should be ~0 for parallel lines
      const dx1 = (result.variables.get('l1.x2') ?? 0) - (result.variables.get('l1.x1') ?? 0);
      const dy1 = (result.variables.get('l1.y2') ?? 0) - (result.variables.get('l1.y1') ?? 0);
      const dx2 = (result.variables.get('l2.x2') ?? 0) - (result.variables.get('l2.x1') ?? 0);
      const dy2 = (result.variables.get('l2.y2') ?? 0) - (result.variables.get('l2.y1') ?? 0);
      const cross = dx1 * dy2 - dy1 * dx2;
      expect(Math.abs(cross)).toBeLessThan(0.1);
    });

    it('should solve perpendicular constraint', () => {
      const l1: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false,
      };
      const l2: SketchElement = {
        id: 'l2', type: 'line', geometry: { x1: 0, y1: 0, x2: 7, y2: 3 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'perpendicular', elements: ['l1', 'l2'] },
      ];

      const result = solveConstraints([l1, l2], constraints);
      expect(result.success).toBe(true);

      // Dot product should be ~0 for perpendicular lines
      const dx1 = (result.variables.get('l1.x2') ?? 0) - (result.variables.get('l1.x1') ?? 0);
      const dy1 = (result.variables.get('l1.y2') ?? 0) - (result.variables.get('l1.y1') ?? 0);
      const dx2 = (result.variables.get('l2.x2') ?? 0) - (result.variables.get('l2.x1') ?? 0);
      const dy2 = (result.variables.get('l2.y2') ?? 0) - (result.variables.get('l2.y1') ?? 0);
      const dot = dx1 * dx2 + dy1 * dy2;
      expect(Math.abs(dot)).toBeLessThan(0.1);
    });

    it('should solve midpoint constraint', () => {
      const point: SketchElement = {
        id: 'p1', type: 'point', geometry: { x: 0, y: 0 }, construction: false,
      };
      const line: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'midpoint', elements: ['p1', 'l1'] },
      ];

      const result = solveConstraints([point, line], constraints);
      expect(result.success).toBe(true);
      const px = result.variables.get('p1.x') ?? 0;
      const py = result.variables.get('p1.y') ?? 0;
      // Point should be at midpoint (5, 0)
      expect(Math.abs(px - 5)).toBeLessThan(0.1);
      expect(Math.abs(py - 0)).toBeLessThan(0.1);
    });

    it('should solve multiple constraints simultaneously', () => {
      // Two lines: make them perpendicular and make their endpoints coincident
      const l1: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 1 }, construction: false,
      };
      const l2: SketchElement = {
        id: 'l2', type: 'line', geometry: { x1: 10, y1: 0, x2: 9, y2: 10 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'perpendicular', elements: ['l1', 'l2'] },
        // Coincident: l1 endpoint (x2,y2) with l2 start (x1,y1)
        { id: 'c2', type: 'coincident', elements: ['l1', 'l2'] },
      ];

      const result = solveConstraints([l1, l2], constraints);
      expect(result.success).toBe(true);
    });

    it('should handle already-satisfied constraints', () => {
      const line: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 5, x2: 10, y2: 5 }, construction: false,
      };
      // Line is already horizontal
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'horizontal', elements: ['l1'] },
      ];

      const result = solveConstraints([line], constraints);
      expect(result.success).toBe(true);
      expect(result.iterations).toBe(0);
    });

    it('should handle constraints referencing non-existent elements', () => {
      const line: SketchElement = {
        id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false,
      };
      const constraints: SketchConstraint[] = [
        { id: 'c1', type: 'horizontal', elements: ['nonexistent'] },
      ];

      const result = solveConstraints([line], constraints);
      // No equations generated → trivially succeeds
      expect(result.success).toBe(true);
      expect(result.iterations).toBe(0);
    });

    it('should build variables for all element types', () => {
      const elements: SketchElement[] = [
        { id: 'p1', type: 'point', geometry: { x: 1, y: 2 }, construction: false },
        { id: 'l1', type: 'line', geometry: { x1: 0, y1: 0, x2: 10, y2: 0 }, construction: false },
        { id: 'c1', type: 'circle', geometry: { cx: 5, cy: 5, r: 3 }, construction: false },
        { id: 'r1', type: 'rectangle', geometry: { x: 0, y: 0, width: 10, height: 5 }, construction: false },
        { id: 'a1', type: 'arc', geometry: { x1: 0, y1: 0, x2: 5, y2: 5, x3: 10, y3: 0 }, construction: false },
      ];

      const result = solveConstraints(elements, []);
      expect(result.success).toBe(true);
      expect(result.variables.get('p1.x')).toBe(1);
      expect(result.variables.get('p1.y')).toBe(2);
      expect(result.variables.get('l1.x1')).toBe(0);
      expect(result.variables.get('c1.r')).toBe(3);
      expect(result.variables.get('r1.w')).toBe(10);
      expect(result.variables.get('a1.x3')).toBe(10);
    });
  });
});
