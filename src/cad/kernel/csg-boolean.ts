/**
 * CSG Boolean Operations using three-bvh-csg.
 *
 * Provides union, subtract, and intersect operations on BufferGeometry.
 * Used by boolean features and for cut/shell operations.
 */

import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

const evaluator = new Evaluator();

/**
 * Create a Brush from a BufferGeometry.
 * The brush must be prepared before CSG evaluation.
 */
function geometryToBrush(geometry: THREE.BufferGeometry): Brush {
  const material = new THREE.MeshStandardMaterial();
  const brush = new Brush(geometry, material);
  brush.prepareGeometry();
  return brush;
}

/**
 * Perform a boolean operation on two geometries.
 *
 * @param a - First geometry (target for subtract)
 * @param b - Second geometry (tool for subtract)
 * @param operation - 'union' | 'subtract' | 'intersect'
 * @returns Resulting BufferGeometry, or null if operation fails
 */
export function booleanTwo(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
  operation: 'union' | 'subtract' | 'intersect',
): THREE.BufferGeometry | null {
  try {
    const brushA = geometryToBrush(a);
    const brushB = geometryToBrush(b);

    let op: number;
    switch (operation) {
      case 'union':
        op = ADDITION;
        break;
      case 'subtract':
        op = SUBTRACTION;
        break;
      case 'intersect':
        op = INTERSECTION;
        break;
    }

    const result = evaluator.evaluate(brushA, brushB, op);
    const geometry = result.geometry.clone();

    // Cleanup
    brushA.disposeCacheData();
    brushB.disposeCacheData();
    result.disposeCacheData();

    return geometry;
  } catch {
    return null;
  }
}

/**
 * Perform a boolean union of multiple geometries.
 * Chains pairwise: (((a ∪ b) ∪ c) ∪ d) ...
 */
export function booleanUnion(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0]!.clone();

  let result: THREE.BufferGeometry | null = geometries[0]!;
  for (let i = 1; i < geometries.length; i++) {
    const next = booleanTwo(result!, geometries[i]!, 'union');
    if (!next) return null;
    result = next;
  }

  return result;
}

/**
 * Subtract multiple tool geometries from a target.
 * Chains: ((target - tool1) - tool2) - tool3 ...
 */
export function booleanSubtract(
  target: THREE.BufferGeometry,
  tools: THREE.BufferGeometry[],
): THREE.BufferGeometry | null {
  if (tools.length === 0) return target.clone();

  let result: THREE.BufferGeometry | null = target;
  for (const tool of tools) {
    const next = booleanTwo(result!, tool, 'subtract');
    if (!next) return null;
    result = next;
  }

  return result;
}

/**
 * Intersect multiple geometries.
 * Chains pairwise: (((a ∩ b) ∩ c) ∩ d) ...
 */
export function booleanIntersect(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length < 2) return null;

  let result: THREE.BufferGeometry | null = geometries[0]!;
  for (let i = 1; i < geometries.length; i++) {
    const next = booleanTwo(result!, geometries[i]!, 'intersect');
    if (!next) return null;
    result = next;
  }

  return result;
}
