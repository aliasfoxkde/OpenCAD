/**
 * SketchCanvas — renders the 2D sketch as an HTML5 Canvas overlay.
 * Handles drawing, element rendering, constraint visualization,
 * snap indicators, and selection highlighting.
 */

import { useRef, useEffect, useCallback } from 'react';
import { useSketchStore } from '../../stores/sketch-store';
import { findSnap } from '../../cad/sketcher/snap-engine';
import type { Point2D } from '../../stores/sketch-store';
import type { SketchElement, SketchConstraint, ConstraintType } from '../../types/cad';

const GRID_SIZE = 10;
const GRID_SUBDIVISIONS = 5;

/** Number of elements required for each constraint type */
const CONSTRAINT_ELEMENT_COUNT: Partial<Record<ConstraintType, number>> = {
  coincident: 2,
  parallel: 2,
  perpendicular: 2,
  tangent: 2,
  equal: 2,
  distance: 2,
  angle: 2,
  horizontal: 1,
  vertical: 1,
  fix: 1,
  midpoint: 2,
  radius: 1,
  diameter: 1,
};
const COLORS = {
  grid: '#1e3a5f',
  gridSub: '#172a45',
  axisX: '#ef4444',
  axisY: '#22c55e',
  element: '#60a5fa',
  elementHover: '#93c5fd',
  elementSelected: '#3b82f6',
  construction: '#64748b',
  constraint: '#fbbf24',
  dimension: '#94a3b8',
  snapEndpoint: '#f97316',
  snapMidpoint: '#a855f7',
  snapCenter: '#22d3ee',
  snapGrid: '#475569',
  drawing: '#34d399',
  preview: '#34d39980',
  background: '#0f172a',
};

export function SketchCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = useSketchStore((s) => s.active);
  const elements = useSketchStore((s) => s.elements);
  const constraints = useSketchStore((s) => s.constraints);
  const tool = useSketchStore((s) => s.tool);
  const selectedIds = useSketchStore((s) => s.selectedIds);
  const hoveredId = useSketchStore((s) => s.hoveredId);
  const cursor = useSketchStore((s) => s.cursor);
  const snap = useSketchStore((s) => s.snap);
  const drawing = useSketchStore((s) => s.drawing);
  const pendingConstraintType = useSketchStore((s) => s.pendingConstraintType);

  const setCursor = useSketchStore((s) => s.setCursor);
  const setSnap = useSketchStore((s) => s.setSnap);
  const setHovered = useSketchStore((s) => s.setHovered);
  const select = useSketchStore((s) => s.select);
  const startDrawing = useSketchStore((s) => s.startDrawing);
  const continueDrawing = useSketchStore((s) => s.continueDrawing);
  const finishDrawing = useSketchStore((s) => s.finishDrawing);
  const cancelDrawing = useSketchStore((s) => s.cancelDrawing);
  const addConstraint = useSketchStore((s) => s.addConstraint);
  const setPendingConstraintType = useSketchStore((s) => s.setPendingConstraintType);

  // Render loop
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to container
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw axes
    drawAxes(ctx, canvas.width, canvas.height);

    // Draw elements
    for (const el of elements) {
      const isSelected = selectedIds.includes(el.id);
      const isHovered = hoveredId === el.id;
      drawElement(ctx, el, isSelected, isHovered);
    }

    // Draw constraints
    for (const constraint of constraints) {
      drawConstraint(ctx, constraint, elements);
    }

    // Draw in-progress shape
    if (drawing && cursor) {
      drawPreview(ctx, drawing.type, drawing.points, cursor, snap?.point);
    }

    // Draw snap indicator
    if (snap && cursor) {
      drawSnapIndicator(ctx, snap);
    }
  }, [active, elements, constraints, selectedIds, hoveredId, cursor, snap, drawing]);

  // Mouse handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - canvas.width / 2;
      const y = -(e.clientY - rect.top - canvas.height / 2); // Flip Y for CAD

      const point: Point2D = { x, y };
      setCursor(point);

      // Find snap
      const snapResult = findSnap({
        elements,
        cursor: point,
        gridSize: GRID_SIZE,
      });
      setSnap(snapResult);

      // Check hover
      if (tool === 'select') {
        const hit = hitTest(point, elements);
        setHovered(hit);
      }
    },
    [elements, tool],
  );

  const handleClick = useCallback(
    (_e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = snap?.point ?? cursor;
      if (!point) return;

      switch (tool) {
        case 'select': {
          const hit = hitTest(point, elements);
          select(hit ? [hit] : []);
          break;
        }
        case 'constraint': {
          if (!pendingConstraintType) break;
          const hit = hitTest(point, elements);
          if (!hit) break;
          const requiredCount = CONSTRAINT_ELEMENT_COUNT[pendingConstraintType] ?? 2;
          const newSelection = [...selectedIds, hit];
          if (newSelection.length >= requiredCount) {
            addConstraint({
              type: pendingConstraintType,
              elements: newSelection.slice(0, requiredCount),
            });
            select([]);
            setPendingConstraintType(null);
          } else {
            select(newSelection);
          }
          break;
        }
        case 'line':
        case 'circle':
        case 'arc':
        case 'rectangle':
        case 'ellipse':
        case 'spline':
        case 'point': {
          if (!drawing) {
            startDrawing(tool, point);
          } else {
            if (needsTwoPoints(tool) && drawing.points.length === 1) {
              continueDrawing(point);
              finishDrawing();
            } else if (tool === 'arc' && drawing.points.length < 2) {
              continueDrawing(point);
            } else if (tool === 'arc' && drawing.points.length === 2) {
              continueDrawing(point);
              finishDrawing();
            } else if (tool === 'spline') {
              continueDrawing(point);
            } else {
              finishDrawing();
            }
          }
          break;
        }
      }
    },
    [tool, cursor, snap, drawing, elements, selectedIds, pendingConstraintType],
  );

  const handleDblClick = useCallback(() => {
    // Finish spline or multi-point shapes
    if (drawing) {
      finishDrawing();
    }
  }, [drawing]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    cancelDrawing();
  }, []);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        cursor: tool === 'select' ? 'default' : 'crosshair',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}

// === Drawing helpers ===

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  // Sub-grid
  ctx.strokeStyle = COLORS.gridSub;
  ctx.lineWidth = 0.5;
  const subSize = GRID_SIZE / GRID_SUBDIVISIONS;
  for (let x = cx % subSize; x < w; x += subSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = cy % subSize; y < h; y += subSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Main grid
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.8;
  for (let x = cx % GRID_SIZE; x < w; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = cy % GRID_SIZE; y < h; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;

  // X axis
  ctx.strokeStyle = COLORS.axisX;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.stroke();

  // Y axis
  ctx.strokeStyle = COLORS.axisY;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();
}

function drawElement(ctx: CanvasRenderingContext2D, el: SketchElement, isSelected: boolean, isHovered: boolean) {
  const color = el.construction
    ? COLORS.construction
    : isSelected
      ? COLORS.elementSelected
      : isHovered
        ? COLORS.elementHover
        : COLORS.element;

  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
  ctx.setLineDash(el.construction ? [6, 4] : []);

  const g = el.geometry;

  switch (el.type) {
    case 'line': {
      const canvas = ctx.canvas;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.beginPath();
      ctx.moveTo(cx + (g.x1 as number), cy - (g.y1 as number));
      ctx.lineTo(cx + (g.x2 as number), cy - (g.y2 as number));
      ctx.stroke();
      // Draw endpoints
      drawEndpoint(ctx, cx + (g.x1 as number), cy - (g.y1 as number), isSelected);
      drawEndpoint(ctx, cx + (g.x2 as number), cy - (g.y2 as number), isSelected);
      break;
    }
    case 'circle': {
      const canvas = ctx.canvas;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.beginPath();
      ctx.arc(cx + (g.cx as number), cy - (g.cy as number), g.r as number, 0, Math.PI * 2);
      ctx.stroke();
      // Draw center
      drawCenterPoint(ctx, cx + (g.cx as number), cy - (g.cy as number));
      break;
    }
    case 'arc': {
      const canvas = ctx.canvas;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      // 3-point arc: compute center, radius, start/end angles
      const x1 = g.x1 as number,
        y1 = g.y1 as number;
      const x2 = g.x2 as number,
        y2 = g.y2 as number;
      const x3 = g.x3 as number,
        y3 = g.y3 as number;
      // Use canvas arc with computed values
      drawThreePointArc(ctx, cx, cy, x1, y1, x2, y2, x3, y3);
      break;
    }
    case 'rectangle': {
      const canvas = ctx.canvas;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const rx = cx + (g.x as number);
      const ry = cy - (g.y as number);
      ctx.strokeRect(rx, ry, g.width as number, -(g.height as number));
      break;
    }
    case 'point': {
      const canvas = ctx.canvas;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      drawEndpoint(ctx, cx + (g.x as number), cy - (g.y as number), true);
      break;
    }
  }

  ctx.setLineDash([]);
}

function drawEndpoint(ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean) {
  ctx.fillStyle = filled ? COLORS.elementSelected : COLORS.element;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawCenterPoint(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = COLORS.element;
  ctx.lineWidth = 1;
  const size = 5;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

function drawThreePointArc(
  ctx: CanvasRenderingContext2D,
  canvasCx: number,
  canvasCy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
) {
  // Compute center and radius from 3 points
  const d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  if (Math.abs(d) < 1e-10) return;

  const ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / d;
  const uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / d;
  const r = Math.sqrt((x1 - ux) ** 2 + (y1 - uy) ** 2);

  const startAngle = Math.atan2(y1 - uy, x1 - ux);
  const endAngle = Math.atan2(y3 - uy, x3 - ux);

  // Determine direction
  let cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const ccw = cross > 0;

  // In canvas coords, Y is flipped
  ctx.beginPath();
  ctx.arc(canvasCx + ux, canvasCy - uy, r, -startAngle, -endAngle, ccw);
  ctx.stroke();

  drawEndpoint(ctx, canvasCx + x1, canvasCy - y1, false);
  drawEndpoint(ctx, canvasCx + x3, canvasCy - y3, false);
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  type: string,
  points: Point2D[],
  cursor: Point2D,
  snapPoint?: Point2D,
) {
  const target = snapPoint ?? cursor;
  const canvas = ctx.canvas;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.strokeStyle = COLORS.preview;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  switch (type) {
    case 'line': {
      if (points.length >= 1) {
        ctx.beginPath();
        ctx.moveTo(cx + points[0]!.x, cy - points[0]!.y);
        ctx.lineTo(cx + target.x, cy - target.y);
        ctx.stroke();
      }
      break;
    }
    case 'circle': {
      if (points.length >= 1) {
        const dx = target.x - points[0]!.x;
        const dy = target.y - points[0]!.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(cx + points[0]!.x, cy - points[0]!.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'rectangle': {
      if (points.length >= 1) {
        const rx = cx + Math.min(points[0]!.x, target.x);
        const ry = cy - Math.max(points[0]!.y, target.y);
        const w = Math.abs(target.x - points[0]!.x);
        const h = Math.abs(target.y - points[0]!.y);
        ctx.strokeRect(rx, ry, w, h);
      }
      break;
    }
    case 'arc': {
      if (points.length === 1) {
        ctx.beginPath();
        ctx.moveTo(cx + points[0]!.x, cy - points[0]!.y);
        ctx.lineTo(cx + target.x, cy - target.y);
        ctx.stroke();
      } else if (points.length === 2) {
        drawThreePointArc(ctx, cx, cy, points[0]!.x, points[0]!.y, points[1]!.x, points[1]!.y, target.x, target.y);
      }
      break;
    }
    case 'spline': {
      ctx.beginPath();
      if (points.length >= 1) {
        ctx.moveTo(cx + points[0]!.x, cy - points[0]!.y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(cx + points[i]!.x, cy - points[i]!.y);
        }
        ctx.lineTo(cx + target.x, cy - target.y);
      }
      ctx.stroke();
      break;
    }
  }

  ctx.setLineDash([]);
}

function drawSnapIndicator(ctx: CanvasRenderingContext2D, snap: { point: Point2D; type: string }) {
  const canvas = ctx.canvas;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const x = cx + snap.point.x;
  const y = cy - snap.point.y;

  const colorMap: Record<string, string> = {
    endpoint: COLORS.snapEndpoint,
    midpoint: COLORS.snapMidpoint,
    center: COLORS.snapCenter,
    grid: COLORS.snapGrid,
  };

  const color = colorMap[snap.type] ?? COLORS.snapGrid;
  const size = 6;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  if (snap.type === 'endpoint') {
    // Square
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  } else if (snap.type === 'midpoint') {
    // Diamond
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x, y + size / 2);
    ctx.lineTo(x - size / 2, y);
    ctx.closePath();
    ctx.stroke();
  } else if (snap.type === 'center') {
    // Circle
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Cross
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x + size / 2, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x, y + size / 2);
    ctx.stroke();
  }
}

function drawConstraint(ctx: CanvasRenderingContext2D, constraint: SketchConstraint, elements: SketchElement[]) {
  const canvas = ctx.canvas;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Find positions of constrained elements for visualization
  const positions: Point2D[] = [];
  for (const elId of constraint.elements) {
    const el = elements.find((e) => e.id === elId);
    if (!el) continue;
    const g = el.geometry;
    switch (el.type) {
      case 'line':
        positions.push({ x: ((g.x1 as number) + (g.x2 as number)) / 2, y: ((g.y1 as number) + (g.y2 as number)) / 2 });
        break;
      case 'circle':
        positions.push({ x: g.cx as number, y: g.cy as number });
        break;
      case 'point':
        positions.push({ x: g.x as number, y: g.y as number });
        break;
      case 'rectangle':
        positions.push({ x: (g.x as number) + (g.width as number) / 2, y: (g.y as number) + (g.height as number) / 2 });
        break;
      default:
        positions.push({ x: 0, y: 0 });
    }
  }

  if (positions.length === 0) return;

  // Compute midpoint for label placement
  const midX = positions.reduce((s, p) => s + p.x, 0) / positions.length;
  const midY = positions.reduce((s, p) => s + p.y, 0) / positions.length;

  // Draw constraint symbol
  const symbols: Partial<Record<ConstraintType, string>> = {
    horizontal: '\u2194',
    vertical: '\u2195',
    parallel: '//',
    perpendicular: '\u22A5',
    tangent: '\u25CB',
    coincident: '\u2295',
    equal: '=',
    fix: '\u2605',
    distance: '\u2194',
    angle: '\u2220',
    radius: 'R',
    midpoint: '\u00D7',
  };

  ctx.fillStyle = COLORS.constraint;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const symbol = symbols[constraint.type] ?? constraint.type;
  const label = constraint.value !== undefined ? `${symbol} ${constraint.value}` : symbol;
  ctx.fillText(label, cx + midX, cy - midY - 10);

  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

// === Hit testing ===

function hitTest(point: Point2D, elements: SketchElement[]): string | null {
  const threshold = 5;

  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]!;
    if (isNearElement(point, el, threshold)) {
      return el.id;
    }
  }

  return null;
}

function isNearElement(point: Point2D, el: SketchElement, threshold: number): boolean {
  const g = el.geometry;

  switch (el.type) {
    case 'line': {
      return (
        distToSegment(point, { x: g.x1 as number, y: g.y1 as number }, { x: g.x2 as number, y: g.y2 as number }) <
        threshold
      );
    }
    case 'circle': {
      const dx = point.x - (g.cx as number);
      const dy = point.y - (g.cy as number);
      const dist = Math.abs(Math.sqrt(dx * dx + dy * dy) - (g.r as number));
      return dist < threshold;
    }
    case 'rectangle': {
      const rx = g.x as number,
        ry = g.y as number;
      const rw = g.width as number,
        rh = g.height as number;
      // Check if near any edge
      const edges: [Point2D, Point2D][] = [
        [
          { x: rx, y: ry },
          { x: rx + rw, y: ry },
        ],
        [
          { x: rx + rw, y: ry },
          { x: rx + rw, y: ry + rh },
        ],
        [
          { x: rx + rw, y: ry + rh },
          { x: rx, y: ry + rh },
        ],
        [
          { x: rx, y: ry + rh },
          { x: rx, y: ry },
        ],
      ];
      return edges.some(([a, b]) => distToSegment(point, a, b) < threshold);
    }
    case 'point': {
      const dx = point.x - (g.x as number);
      const dy = point.y - (g.y as number);
      return Math.sqrt(dx * dx + dy * dy) < threshold;
    }
    default:
      return false;
  }
}

function distToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

function needsTwoPoints(tool: string): boolean {
  return ['line', 'circle', 'rectangle', 'ellipse'].includes(tool);
}
