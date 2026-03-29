/**
 * Constraint Solver — solves 2D sketch constraints using Newton-Raphson iteration.
 *
 * Each constraint contributes equations to the system. The solver iteratively
 * adjusts free variables (point positions, radii) to minimize constraint residuals.
 */

import type { SketchElement, SketchConstraint } from '../../types/cad';

interface Equation {
  evaluate: (vars: Map<string, number>) => number;
  jacobian: (vars: Map<string, number>) => Map<string, number>;
}

export interface SolveResult {
  success: boolean;
  iterations: number;
  residual: number;
  variables: Map<string, number>;
  error?: string;
}

const MAX_ITERATIONS = 100;
const CONVERGENCE_THRESHOLD = 1e-8;
const DAMPING = 0.9;

/**
 * Solve the constraint system for the given elements and constraints.
 */
export function solveConstraints(
  elements: SketchElement[],
  constraints: SketchConstraint[],
): SolveResult {
  const vars = buildVariables(elements);
  const equations = buildEquations(elements, constraints);

  if (equations.length === 0) {
    return { success: true, iterations: 0, residual: 0, variables: vars };
  }

  let iteration = 0;
  let residual = Infinity;

  while (iteration < MAX_ITERATIONS && residual > CONVERGENCE_THRESHOLD) {
    const residuals: number[] = [];
    const jacobianRows: Map<string, number>[] = [];

    for (const eq of equations) {
      residuals.push(eq.evaluate(vars));
      jacobianRows.push(eq.jacobian(vars));
    }

    residual = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0));
    if (residual <= CONVERGENCE_THRESHOLD) break;

    const freeVarIds = Array.from(vars.keys());
    if (freeVarIds.length === 0) break;

    const delta = solveLinearSystem(jacobianRows, residuals, freeVarIds);
    if (delta) {
      for (const varId of freeVarIds) {
        const current = vars.get(varId) ?? 0;
        const d = delta.get(varId) ?? 0;
        vars.set(varId, current + DAMPING * d);
      }
    }

    iteration++;
  }

  return {
    success: residual <= CONVERGENCE_THRESHOLD * 10,
    iterations: iteration,
    residual,
    variables: vars,
  };
}

function buildVariables(elements: SketchElement[]): Map<string, number> {
  const vars = new Map<string, number>();
  for (const el of elements) {
    const g = el.geometry;
    switch (el.type) {
      case 'point':
        vars.set(`${el.id}.x`, g.x as number);
        vars.set(`${el.id}.y`, g.y as number);
        break;
      case 'line':
        vars.set(`${el.id}.x1`, g.x1 as number);
        vars.set(`${el.id}.y1`, g.y1 as number);
        vars.set(`${el.id}.x2`, g.x2 as number);
        vars.set(`${el.id}.y2`, g.y2 as number);
        break;
      case 'circle':
        vars.set(`${el.id}.cx`, g.cx as number);
        vars.set(`${el.id}.cy`, g.cy as number);
        vars.set(`${el.id}.r`, g.r as number);
        break;
      case 'rectangle':
        vars.set(`${el.id}.x`, g.x as number);
        vars.set(`${el.id}.y`, g.y as number);
        vars.set(`${el.id}.w`, g.width as number);
        vars.set(`${el.id}.h`, g.height as number);
        break;
      case 'arc':
        vars.set(`${el.id}.x1`, g.x1 as number);
        vars.set(`${el.id}.y1`, g.y1 as number);
        vars.set(`${el.id}.x2`, g.x2 as number);
        vars.set(`${el.id}.y2`, g.y2 as number);
        vars.set(`${el.id}.x3`, g.x3 as number);
        vars.set(`${el.id}.y3`, g.y3 as number);
        break;
    }
  }
  return vars;
}

function buildEquations(elements: SketchElement[], constraints: SketchConstraint[]): Equation[] {
  const elMap = new Map(elements.map((e) => [e.id, e]));
  const equations: Equation[] = [];

  for (const c of constraints) {
    const els = c.elements.map((id) => elMap.get(id)).filter((e): e is SketchElement => e !== undefined);

    switch (c.type) {
      case 'coincident':
        if (els.length >= 2) equations.push(...coincidentEquations(els[0]!, els[1]!));
        break;
      case 'horizontal':
        if (els.length >= 1) equations.push(...horizontalEquations(els[0]!));
        break;
      case 'vertical':
        if (els.length >= 1) equations.push(...verticalEquations(els[0]!));
        break;
      case 'parallel':
        if (els.length >= 2) equations.push(...parallelEquations(els[0]!, els[1]!));
        break;
      case 'perpendicular':
        if (els.length >= 2) equations.push(...perpendicularEquations(els[0]!, els[1]!));
        break;
      case 'distance':
        if (els.length >= 2 && c.value !== undefined) equations.push(...distanceEquations(els[0]!, els[1]!, c.value));
        break;
      case 'equal':
        if (els.length >= 2) equations.push(...equalEquations(els[0]!, els[1]!));
        break;
      case 'fix':
        if (els.length >= 1) equations.push(...fixEquations(els[0]!));
        break;
      case 'midpoint':
        if (els.length >= 2) equations.push(...midpointEquations(els[0]!, els[1]!));
        break;
    }
  }

  return equations;
}

// === Constraint equation builders ===

function coincidentEquations(el1: SketchElement, el2: SketchElement): Equation[] {
  const p1 = firstPoint(el1);
  const p2 = firstPoint(el2);
  if (!p1 || !p2) return [];
  return [
    {
      evaluate: (v) => (v.get(p1.xId) ?? 0) - (v.get(p2.xId) ?? 0),
      jacobian: () => new Map([[p1.xId, 1], [p2.xId, -1]]),
    },
    {
      evaluate: (v) => (v.get(p1.yId) ?? 0) - (v.get(p2.yId) ?? 0),
      jacobian: () => new Map([[p1.yId, 1], [p2.yId, -1]]),
    },
  ];
}

function horizontalEquations(el: SketchElement): Equation[] {
  if (el.type !== 'line') return [];
  return [{
    evaluate: (v) => (v.get(`${el.id}.y1`) ?? 0) - (v.get(`${el.id}.y2`) ?? 0),
    jacobian: () => new Map([[`${el.id}.y1`, 1], [`${el.id}.y2`, -1]]),
  }];
}

function verticalEquations(el: SketchElement): Equation[] {
  if (el.type !== 'line') return [];
  return [{
    evaluate: (v) => (v.get(`${el.id}.x1`) ?? 0) - (v.get(`${el.id}.x2`) ?? 0),
    jacobian: () => new Map([[`${el.id}.x1`, 1], [`${el.id}.x2`, -1]]),
  }];
}

function parallelEquations(el1: SketchElement, el2: SketchElement): Equation[] {
  if (el1.type !== 'line' || el2.type !== 'line') return [];
  const e1 = el1.id, e2 = el2.id;
  return [{
    evaluate: (v) => {
      const dx1 = (v.get(`${e1}.x2`) ?? 0) - (v.get(`${e1}.x1`) ?? 0);
      const dy1 = (v.get(`${e1}.y2`) ?? 0) - (v.get(`${e1}.y1`) ?? 0);
      const dx2 = (v.get(`${e2}.x2`) ?? 0) - (v.get(`${e2}.x1`) ?? 0);
      const dy2 = (v.get(`${e2}.y2`) ?? 0) - (v.get(`${e2}.y1`) ?? 0);
      return dx1 * dy2 - dy1 * dx2;
    },
    jacobian: (v) => {
      const dx2 = (v.get(`${e2}.x2`) ?? 0) - (v.get(`${e2}.x1`) ?? 0);
      const dy2 = (v.get(`${e2}.y2`) ?? 0) - (v.get(`${e2}.y1`) ?? 0);
      const dx1 = (v.get(`${e1}.x2`) ?? 0) - (v.get(`${e1}.x1`) ?? 0);
      const dy1 = (v.get(`${e1}.y2`) ?? 0) - (v.get(`${e1}.y1`) ?? 0);
      return new Map([
        [`${e1}.x1`, -dy2], [`${e1}.y1`, dx2], [`${e1}.x2`, dy2], [`${e1}.y2`, -dx2],
        [`${e2}.x1`, -dy1], [`${e2}.y1`, dx1], [`${e2}.x2`, dy1], [`${e2}.y2`, -dx1],
      ]);
    },
  }];
}

function perpendicularEquations(el1: SketchElement, el2: SketchElement): Equation[] {
  if (el1.type !== 'line' || el2.type !== 'line') return [];
  const e1 = el1.id, e2 = el2.id;
  return [{
    evaluate: (v) => {
      const dx1 = (v.get(`${e1}.x2`) ?? 0) - (v.get(`${e1}.x1`) ?? 0);
      const dy1 = (v.get(`${e1}.y2`) ?? 0) - (v.get(`${e1}.y1`) ?? 0);
      const dx2 = (v.get(`${e2}.x2`) ?? 0) - (v.get(`${e2}.x1`) ?? 0);
      const dy2 = (v.get(`${e2}.y2`) ?? 0) - (v.get(`${e2}.y1`) ?? 0);
      return dx1 * dx2 + dy1 * dy2;
    },
    jacobian: (v) => {
      const dx2 = (v.get(`${e2}.x2`) ?? 0) - (v.get(`${e2}.x1`) ?? 0);
      const dy2 = (v.get(`${e2}.y2`) ?? 0) - (v.get(`${e2}.y1`) ?? 0);
      const dx1 = (v.get(`${e1}.x2`) ?? 0) - (v.get(`${e1}.x1`) ?? 0);
      const dy1 = (v.get(`${e1}.y2`) ?? 0) - (v.get(`${e1}.y1`) ?? 0);
      return new Map([
        [`${e1}.x1`, -dx2], [`${e1}.y1`, -dy2], [`${e1}.x2`, dx2], [`${e1}.y2`, dy2],
        [`${e2}.x1`, -dx1], [`${e2}.y1`, -dy1], [`${e2}.x2`, dx1], [`${e2}.y2`, dy1],
      ]);
    },
  }];
}

function distanceEquations(el1: SketchElement, el2: SketchElement, dist: number): Equation[] {
  const p1 = firstPoint(el1);
  const p2 = firstPoint(el2);
  if (!p1 || !p2) return [];
  return [{
    evaluate: (v) => {
      const dx = (v.get(p1.xId) ?? 0) - (v.get(p2.xId) ?? 0);
      const dy = (v.get(p1.yId) ?? 0) - (v.get(p2.yId) ?? 0);
      return Math.sqrt(dx * dx + dy * dy) - dist;
    },
    jacobian: (v) => {
      const dx = (v.get(p1.xId) ?? 0) - (v.get(p2.xId) ?? 0);
      const dy = (v.get(p1.yId) ?? 0) - (v.get(p2.yId) ?? 0);
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-10) return new Map();
      return new Map([
        [p1.xId, dx / len], [p1.yId, dy / len],
        [p2.xId, -dx / len], [p2.yId, -dy / len],
      ]);
    },
  }];
}

function equalEquations(el1: SketchElement, el2: SketchElement): Equation[] {
  if (el1.type === 'line' && el2.type === 'line') {
    const e1 = el1.id, e2 = el2.id;
    return [{
      evaluate: (v) => lineLen(v, e1) - lineLen(v, e2),
      jacobian: (v) => {
        const j = new Map<string, number>();
        const l1 = lineLen(v, e1), l2 = lineLen(v, e2);
        if (l1 > 1e-10) {
          const dx = (v.get(`${e1}.x2`) ?? 0) - (v.get(`${e1}.x1`) ?? 0);
          const dy = (v.get(`${e1}.y2`) ?? 0) - (v.get(`${e1}.y1`) ?? 0);
          j.set(`${e1}.x2`, dx / l1); j.set(`${e1}.y2`, dy / l1);
          j.set(`${e1}.x1`, -dx / l1); j.set(`${e1}.y1`, -dy / l1);
        }
        if (l2 > 1e-10) {
          const dx = (v.get(`${e2}.x2`) ?? 0) - (v.get(`${e2}.x1`) ?? 0);
          const dy = (v.get(`${e2}.y2`) ?? 0) - (v.get(`${e2}.y1`) ?? 0);
          j.set(`${e2}.x2`, -dx / l2); j.set(`${e2}.y2`, -dy / l2);
          j.set(`${e2}.x1`, dx / l2); j.set(`${e2}.y1`, dy / l2);
        }
        return j;
      },
    }];
  }
  if (el1.type === 'circle' && el2.type === 'circle') {
    return [{
      evaluate: (v) => (v.get(`${el1.id}.r`) ?? 0) - (v.get(`${el2.id}.r`) ?? 0),
      jacobian: () => new Map([[`${el1.id}.r`, 1], [`${el2.id}.r`, -1]]),
    }];
  }
  return [];
}

function fixEquations(_el: SketchElement): Equation[] {
  return [{
    evaluate: () => 0,
    jacobian: () => new Map(),
  }];
}

function midpointEquations(el1: SketchElement, el2: SketchElement): Equation[] {
  if (el1.type !== 'point' || el2.type !== 'line') return [];
  return [
    {
      evaluate: (v) => {
        const px = v.get(`${el1.id}.x`) ?? 0;
        const mx = ((v.get(`${el2.id}.x1`) ?? 0) + (v.get(`${el2.id}.x2`) ?? 0)) / 2;
        return px - mx;
      },
      jacobian: () => new Map([[`${el1.id}.x`, 1], [`${el2.id}.x1`, -0.5], [`${el2.id}.x2`, -0.5]]),
    },
    {
      evaluate: (v) => {
        const py = v.get(`${el1.id}.y`) ?? 0;
        const my = ((v.get(`${el2.id}.y1`) ?? 0) + (v.get(`${el2.id}.y2`) ?? 0)) / 2;
        return py - my;
      },
      jacobian: () => new Map([[`${el1.id}.y`, 1], [`${el2.id}.y1`, -0.5], [`${el2.id}.y2`, -0.5]]),
    },
  ];
}

// === Helpers ===

interface PointRef { xId: string; yId: string }

function firstPoint(el: SketchElement): PointRef | null {
  switch (el.type) {
    case 'point': return { xId: `${el.id}.x`, yId: `${el.id}.y` };
    case 'line': return { xId: `${el.id}.x1`, yId: `${el.id}.y1` };
    case 'circle': return { xId: `${el.id}.cx`, yId: `${el.id}.cy` };
    case 'rectangle': return { xId: `${el.id}.x`, yId: `${el.id}.y` };
    case 'arc': return { xId: `${el.id}.x1`, yId: `${el.id}.y1` };
    default: return null;
  }
}

function lineLen(v: Map<string, number>, id: string): number {
  const dx = (v.get(`${id}.x2`) ?? 0) - (v.get(`${id}.x1`) ?? 0);
  const dy = (v.get(`${id}.y2`) ?? 0) - (v.get(`${id}.y1`) ?? 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function solveLinearSystem(
  jacobianRows: Map<string, number>[],
  residuals: number[],
  varIds: string[],
): Map<string, number> | null {
  const n = jacobianRows.length;
  const m = varIds.length;
  if (n === 0 || m === 0) return null;

  // Build augmented matrix [J | -R]
  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (const varId of varIds) {
      row.push(jacobianRows[i]?.get(varId) ?? 0);
    }
    row.push(-residuals[i]!);
    matrix.push(row);
  }

  // Gaussian elimination with separate row/col tracking
  const pivotCol = new Array(n).fill(-1); // which column is the pivot for each row
  let row = 0;
  for (let col = 0; col < m && row < n; col++) {
    // Find pivot in this column
    let maxVal = Math.abs(matrix[row]?.[col] ?? 0);
    let maxRow = row;
    for (let r = row + 1; r < n; r++) {
      const val = Math.abs(matrix[r]?.[col] ?? 0);
      if (val > maxVal) { maxVal = val; maxRow = r; }
    }
    if (maxVal < 1e-12) continue; // Skip zero columns
    if (maxRow !== row) {
      [matrix[row], matrix[maxRow]] = [matrix[maxRow]!, matrix[row]!];
    }
    pivotCol[row] = col;

    // Eliminate below
    for (let r = row + 1; r < n; r++) {
      const factor = (matrix[r]?.[col] ?? 0) / (matrix[row]?.[col] ?? 1);
      for (let j = col; j <= m; j++) {
        matrix[r]![j] = (matrix[r]![j] ?? 0) - factor * (matrix[row]?.[j] ?? 0);
      }
    }
    row++;
  }

  const rank = row;

  // Back-substitution using tracked pivots
  const result = new Map<string, number>();
  for (let r = rank - 1; r >= 0; r--) {
    const col = pivotCol[r]!;
    let sum = matrix[r]?.[m] ?? 0;
    for (let j = col + 1; j < m; j++) {
      sum -= (matrix[r]?.[j] ?? 0) * (result.get(varIds[j]!) ?? 0);
    }
    const pivot = matrix[r]?.[col] ?? 0;
    if (Math.abs(pivot) > 1e-12) {
      result.set(varIds[col]!, sum / pivot);
    }
  }
  return result;
}
