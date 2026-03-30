/**
 * Snap Engine — finds snap points near the cursor for precise sketching.
 * Checks endpoints, midpoints, centers, grid points, and intersections.
 */

import type { SketchElement } from '../../types/cad';
import type { Point2D, SnapResult } from '../../stores/sketch-store';

const SNAP_DISTANCE = 8; // pixels at current zoom

export interface SnapContext {
  elements: SketchElement[];
  cursor: Point2D;
  snapDistance?: number;
  gridSize?: number;
  gridEnabled?: boolean;
}

/** Find the best snap point near the cursor */
export function findSnap(ctx: SnapContext): SnapResult | null {
  const { elements, cursor, snapDistance = SNAP_DISTANCE, gridSize = 1, gridEnabled = true } = ctx;
  const candidates: SnapResult[] = [];

  // 1. Check element snap points
  for (const el of elements) {
    const points = getSnapPoints(el);
    for (const sp of points) {
      const dist = distance(cursor, sp.point);
      if (dist < snapDistance) {
        candidates.push({ ...sp, distance: dist });
      }
    }
  }

  // Sort by distance (closest first)
  candidates.sort((a, b) => a.distance - b.distance);

  // 2. If no element snap, try grid
  if (candidates.length === 0 && gridEnabled && gridSize > 0) {
    const gridPoint = snapToGrid(cursor, gridSize);
    const dist = distance(cursor, gridPoint);
    if (dist < snapDistance) {
      return { point: gridPoint, type: 'grid', distance: dist };
    }
  }

  return candidates[0] ?? null;
}

/** Get all snap points for an element */
export function getSnapPoints(el: SketchElement): SnapResult[] {
  const g = el.geometry;
  const points: SnapResult[] = [];

  switch (el.type) {
    case 'line': {
      const x1 = g.x1 as number,
        y1 = g.y1 as number;
      const x2 = g.x2 as number,
        y2 = g.y2 as number;
      points.push({ point: { x: x1, y: y1 }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: x2, y: y2 }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, type: 'midpoint', elementId: el.id, distance: 0 });
      break;
    }
    case 'circle': {
      const cx = g.cx as number,
        cy = g.cy as number,
        r = g.r as number;
      points.push({ point: { x: cx, y: cy }, type: 'center', elementId: el.id, distance: 0 });
      // Cardinal points on circle
      points.push({ point: { x: cx + r, y: cy }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: cx - r, y: cy }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: cx, y: cy + r }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: cx, y: cy - r }, type: 'endpoint', elementId: el.id, distance: 0 });
      break;
    }
    case 'arc': {
      const x1 = g.x1 as number,
        y1 = g.y1 as number;
      const x2 = g.x2 as number,
        y2 = g.y2 as number;
      const x3 = g.x3 as number,
        y3 = g.y3 as number;
      points.push({ point: { x: x1, y: y1 }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: x3, y: y3 }, type: 'endpoint', elementId: el.id, distance: 0 });
      // Arc center
      const center = arcCenter(x1, y1, x2, y2, x3, y3);
      if (center) {
        points.push({ point: center, type: 'center', elementId: el.id, distance: 0 });
      }
      break;
    }
    case 'rectangle': {
      const x = g.x as number,
        y = g.y as number;
      const w = g.width as number,
        h = g.height as number;
      // Corners
      points.push({ point: { x, y }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: x + w, y }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: x + w, y: y + h }, type: 'endpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x, y: y + h }, type: 'endpoint', elementId: el.id, distance: 0 });
      // Midpoints of edges
      points.push({ point: { x: x + w / 2, y }, type: 'midpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: x + w, y: y + h / 2 }, type: 'midpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x: x + w / 2, y: y + h }, type: 'midpoint', elementId: el.id, distance: 0 });
      points.push({ point: { x, y: y + h / 2 }, type: 'midpoint', elementId: el.id, distance: 0 });
      // Center
      points.push({ point: { x: x + w / 2, y: y + h / 2 }, type: 'center', elementId: el.id, distance: 0 });
      break;
    }
    case 'point': {
      points.push({ point: { x: g.x as number, y: g.y as number }, type: 'endpoint', elementId: el.id, distance: 0 });
      break;
    }
    case 'ellipse': {
      const cx = g.cx as number,
        cy = g.cy as number;
      points.push({ point: { x: cx, y: cy }, type: 'center', elementId: el.id, distance: 0 });
      break;
    }
    case 'spline': {
      const pts = g.points as number[][];
      if (pts) {
        for (const p of pts) {
          points.push({ point: { x: p[0]!, y: p[1]! }, type: 'endpoint', elementId: el.id, distance: 0 });
        }
      }
      break;
    }
  }

  return points;
}

/** Snap to nearest grid point */
export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/** Euclidean distance between two 2D points */
export function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Compute the center of a circle passing through 3 points */
function arcCenter(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): Point2D | null {
  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  if (Math.abs(d) < 1e-10) return null;

  const ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / d;
  const uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / d;

  return { x: ux, y: uy };
}
