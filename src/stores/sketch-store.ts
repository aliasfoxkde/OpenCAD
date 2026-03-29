/**
 * Sketch Store — manages the state of the active 2D sketch.
 * Handles elements, constraints, tool state, snap points,
 * and undo/redo for sketch operations.
 */

import { create } from 'zustand';
import type { SketchElement, SketchConstraint, ConstraintType, SketchElementType } from '../types/cad';
import { nanoid } from 'nanoid';

export interface Point2D {
  x: number;
  y: number;
}

export interface SnapResult {
  point: Point2D;
  type: 'endpoint' | 'midpoint' | 'center' | 'grid' | 'intersection' | 'perpendicular' | 'tangent';
  elementId?: string;
  distance: number;
}

export type SketchToolType =
  | 'select'
  | 'line'
  | 'arc'
  | 'circle'
  | 'rectangle'
  | 'ellipse'
  | 'spline'
  | 'point'
  | 'constraint';

export interface SketchState {
  /** Whether we are actively in sketch mode */
  active: boolean;
  /** The plane we're sketching on */
  plane: 'xy' | 'xz' | 'yz';
  /** Sketch origin in world coordinates */
  origin: Point2D;
  /** All sketch elements */
  elements: SketchElement[];
  /** All constraints */
  constraints: SketchConstraint[];
  /** Currently active sketch tool */
  tool: SketchToolType;
  /** IDs of selected elements */
  selectedIds: string[];
  /** Hovered element ID */
  hoveredId: string | null;
  /** Current mouse position in sketch coordinates */
  cursor: Point2D | null;
  /** Snap result at current cursor */
  snap: SnapResult | null;
  /** Whether the sketch is fully constrained */
  isFullyConstrained: boolean;
  /** Degrees of freedom count */
  degreesOfFreedom: number;
  /** Constraint type to apply when using constraint tool */
  pendingConstraintType: ConstraintType | null;
  /** In-progress drawing state */
  drawing: DrawingState | null;
  /** Undo stack */
  undoStack: SketchElement[][];
  /** Redo stack */
  redoStack: SketchElement[][];
}

export interface DrawingState {
  type: SketchElementType;
  points: Point2D[];
  preview?: SketchElement;
}

export interface SketchActions {
  enterSketch: (plane: 'xy' | 'xz' | 'yz') => void;
  exitSketch: () => void;
  setTool: (tool: SketchToolType) => void;
  setCursor: (pos: Point2D | null) => void;
  setSnap: (snap: SnapResult | null) => void;
  setHovered: (id: string | null) => void;

  // Element CRUD
  addElement: (element: SketchElement) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, geometry: Record<string, unknown>) => void;

  // Selection
  select: (ids: string[]) => void;
  clearSelection: () => void;

  // Constraints
  addConstraint: (constraint: Omit<SketchConstraint, 'id'>) => void;
  removeConstraint: (id: string) => void;

  // Drawing state
  startDrawing: (type: SketchElementType, point: Point2D) => void;
  continueDrawing: (point: Point2D) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // Solve
  solveConstraints: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  active: false,
  plane: 'xy' as const,
  origin: { x: 0, y: 0 },
  elements: [],
  constraints: [],
  tool: 'select' as SketchToolType,
  selectedIds: [],
  hoveredId: null,
  cursor: null,
  snap: null,
  isFullyConstrained: false,
  degreesOfFreedom: 0,
  pendingConstraintType: null,
  drawing: null,
  undoStack: [],
  redoStack: [],
};

export const useSketchStore = create<SketchState & SketchActions>((set, get) => ({
  ...initialState,

  enterSketch: (plane) => set({ active: true, plane, tool: 'line', elements: [], constraints: [] }),
  exitSketch: () => set({ ...initialState }),

  setTool: (tool) => set({ tool, drawing: null }),

  setCursor: (pos) => set({ cursor: pos }),
  setSnap: (snap) => set({ snap }),
  setHovered: (id) => set({ hoveredId: id }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      undoStack: [...state.undoStack, state.elements],
      redoStack: [],
    })),

  removeElement: (id) =>
    set((state) => {
      const newElements = state.elements.filter((e) => e.id !== id);
      const newConstraints = state.constraints.filter(
        (c) => !c.elements.includes(id),
      );
      return {
        elements: newElements,
        constraints: newConstraints,
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
        undoStack: [...state.undoStack, state.elements],
        redoStack: [],
      };
    }),

  updateElement: (id, geometry) =>
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, geometry: { ...e.geometry, ...geometry } } : e,
      ),
    })),

  select: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),

  addConstraint: (constraint) =>
    set((state) => ({
      constraints: [...state.constraints, { ...constraint, id: nanoid() }],
    })),

  removeConstraint: (id) =>
    set((state) => ({
      constraints: state.constraints.filter((c) => c.id !== id),
    })),

  startDrawing: (type, point) =>
    set({
      drawing: { type, points: [point] },
    }),

  continueDrawing: (point) =>
    set((state) => {
      if (!state.drawing) return {};
      return {
        drawing: { ...state.drawing, points: [...state.drawing.points, point] },
      };
    }),

  finishDrawing: () => {
    const state = get();
    if (!state.drawing) return;

    const element = drawingToElement(state.drawing);
    if (element) {
      set((s) => ({
        elements: [...s.elements, element],
        drawing: null,
        undoStack: [...s.undoStack, s.elements],
        redoStack: [],
      }));
    } else {
      set({ drawing: null });
    }
  },

  cancelDrawing: () => set({ drawing: null }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return {};
      const prev = state.undoStack[state.undoStack.length - 1]!;
      return {
        elements: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.elements],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return {};
      const next = state.redoStack[state.redoStack.length - 1]!;
      return {
        elements: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.elements],
      };
    }),

  solveConstraints: () => {
    // Will be implemented with the constraint solver
    // For now, just count DOF
    const state = get();
    const elementDOF = state.elements.reduce((sum, el) => {
      switch (el.type) {
        case 'point': return sum + 2;
        case 'line': return sum + 4; // 2 endpoints * 2 DOF
        case 'circle': return sum + 3; // center (2) + radius (1)
        case 'arc': return sum + 5; // center (2) + radius (1) + start angle (1) + end angle (1)
        default: return sum + 4;
      }
    }, 0);
    const constraintDOF = state.constraints.reduce((sum, c) => {
      switch (c.type) {
        case 'coincident': return sum + 2;
        case 'horizontal': case 'vertical': return sum + 1;
        case 'parallel': case 'perpendicular': case 'tangent': return sum + 1;
        case 'equal': return sum + 1;
        case 'midpoint': return sum + 2;
        case 'distance': case 'angle': case 'radius': case 'diameter': return sum + 1;
        case 'fix': return sum + 2;
        default: return sum;
      }
    }, 0);
    const dof = Math.max(0, elementDOF - constraintDOF);
    set({ degreesOfFreedom: dof, isFullyConstrained: dof === 0 && state.elements.length > 0 });
  },

  reset: () => set(initialState),
}));

/** Convert drawing state to a sketch element */
function drawingToElement(drawing: DrawingState): SketchElement | null {
  const pts = drawing.points;
  const id = nanoid();

  switch (drawing.type) {
    case 'line': {
      if (pts.length < 2) return null;
      return {
        id,
        type: 'line',
        geometry: { x1: pts[0]!.x, y1: pts[0]!.y, x2: pts[1]!.x, y2: pts[1]!.y },
        construction: false,
      };
    }
    case 'circle': {
      if (pts.length < 2) return null;
      const dx = pts[1]!.x - pts[0]!.x;
      const dy = pts[1]!.y - pts[0]!.y;
      return {
        id,
        type: 'circle',
        geometry: { cx: pts[0]!.x, cy: pts[0]!.y, r: Math.sqrt(dx * dx + dy * dy) },
        construction: false,
      };
    }
    case 'arc': {
      if (pts.length < 3) return null;
      return {
        id,
        type: 'arc',
        geometry: {
          x1: pts[0]!.x, y1: pts[0]!.y,
          x2: pts[1]!.x, y2: pts[1]!.y,
          x3: pts[2]!.x, y3: pts[2]!.y,
        },
        construction: false,
      };
    }
    case 'rectangle': {
      if (pts.length < 2) return null;
      const [p1, p2] = [pts[0]!, pts[1]!];
      return {
        id,
        type: 'rectangle',
        geometry: {
          x: Math.min(p1.x, p2.x),
          y: Math.min(p1.y, p2.y),
          width: Math.abs(p2.x - p1.x),
          height: Math.abs(p2.y - p1.y),
        },
        construction: false,
      };
    }
    case 'point': {
      return {
        id,
        type: 'point',
        geometry: { x: pts[0]!.x, y: pts[0]!.y },
        construction: false,
      };
    }
    case 'spline': {
      if (pts.length < 2) return null;
      return {
        id,
        type: 'spline',
        geometry: { points: pts.map((p) => [p.x, p.y]) },
        construction: false,
      };
    }
    case 'ellipse': {
      if (pts.length < 2) return null;
      return {
        id,
        type: 'ellipse',
        geometry: { cx: pts[0]!.x, cy: pts[0]!.y, rx: Math.abs(pts[1]!.x - pts[0]!.x), ry: Math.abs(pts[1]!.y - pts[0]!.y) },
        construction: false,
      };
    }
    default:
      return null;
  }
}

// Selector hooks
export const useSketchActive = () => useSketchStore((s) => s.active);
export const useSketchTool = () => useSketchStore((s) => s.tool);
export const useSketchElements = () => useSketchStore((s) => s.elements);
export const useSketchConstraints = () => useSketchStore((s) => s.constraints);
export const useSketchSelectedIds = () => useSketchStore((s) => s.selectedIds);
export const useSketchDrawing = () => useSketchStore((s) => s.drawing);
