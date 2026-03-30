/**
 * Assembly Tree Utilities — navigate and transform the parent-child
 * feature hierarchy established by `parentId` on FeatureNode.
 */

import type { FeatureNode } from '../types/cad';

/** Degrees to radians */
export const DEG2RAD = Math.PI / 180;

/** Get root-level features (no parentId) */
export function getRootFeatures(features: FeatureNode[]): FeatureNode[] {
  return features.filter((f) => !f.parentId);
}

/** Get immediate children of a parent (assembly or root) */
export function getDirectChildren(features: FeatureNode[], parentId: string | null): FeatureNode[] {
  if (parentId === null) return getRootFeatures(features);
  return features.filter((f) => f.parentId === parentId);
}

/** Get all descendant features of an assembly (recursive) */
export function getDescendants(features: FeatureNode[], assemblyId: string): FeatureNode[] {
  const descendants: FeatureNode[] = [];
  const children = features.filter((f) => f.parentId === assemblyId);
  for (const child of children) {
    descendants.push(child);
    descendants.push(...getDescendants(features, child.id));
  }
  return descendants;
}

/** Walk up the parentId chain to get all ancestors */
export function getAncestors(features: FeatureNode[], featureId: string): FeatureNode[] {
  const ancestors: FeatureNode[] = [];
  let current: FeatureNode | undefined = features.find((f) => f.id === featureId);
  while (current) {
    const pid = current.parentId;
    if (!pid) break;
    const parent = features.find((f) => f.id === pid);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}

/** Check if any ancestor assembly is suppressed */
export function hasSuppressedAncestor(features: FeatureNode[], featureId: string): boolean {
  const ancestors = getAncestors(features, featureId);
  return ancestors.some((a) => a.suppressed);
}

/**
 * Build a 3x4 row-major transform matrix from an assembly's position + rotation params.
 * Rotation order: XYZ (matches THREE.js Euler default).
 */
export function getAssemblyTransformMatrix(feature: FeatureNode): number[] {
  const px = (feature.parameters.positionX as number) ?? 0;
  const py = (feature.parameters.positionY as number) ?? 0;
  const pz = (feature.parameters.positionZ as number) ?? 0;
  const rx = ((feature.parameters.rotationX as number) ?? 0) * DEG2RAD;
  const ry = ((feature.parameters.rotationY as number) ?? 0) * DEG2RAD;
  const rz = ((feature.parameters.rotationZ as number) ?? 0) * DEG2RAD;

  // Build individual rotation matrices (3x3) then combine
  // Rz * Ry * Rx (intrinsic XYZ = extrinsic ZYX)
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);

  // Combined rotation: R = Rz * Ry * Rx
  const r00 = cy * cz;
  const r01 = cz * sx * sy - cx * sz;
  const r02 = cx * cz * sy + sx * sz;
  const r10 = cy * sz;
  const r11 = cx * cz + sx * sy * sz;
  const r12 = cx * sy * sz - cz * sx;
  const r20 = -sy;
  const r21 = cy * sx;
  const r22 = cx * cy;

  return [r00, r01, r02, px, r10, r11, r12, py, r20, r21, r22, pz];
}

/**
 * Multiply two 3x4 row-major matrices: result = A * B
 */
function multiplyMatrices(a: number[], b: number[]): number[] {
  const result = new Array(12).fill(0);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[row * 4 + k]! * b[k * 4 + col]!;
      }
      result[row * 4 + col] = sum;
    }
    // Translation column
    let trans = 0;
    for (let k = 0; k < 3; k++) {
      trans += a[row * 4 + k]! * b[k * 4 + 3]!;
    }
    result[row * 4 + 3] = trans + a[row * 4 + 3]!;
  }
  return result;
}

/** Identity 3x4 matrix */
const IDENTITY: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

/**
 * Get the effective world-space transform for a feature by multiplying
 * all ancestor assembly transforms together (from outermost to innermost).
 */
export function getEffectiveTransform(features: FeatureNode[], featureId: string): number[] {
  const ancestors = getAncestors(features, featureId);
  // Ancestors are ordered outermost → innermost
  // We need to multiply outermost first, so iterate in order
  let result = IDENTITY;
  for (const ancestor of ancestors) {
    if (ancestor.type !== 'assembly') continue;
    const m = getAssemblyTransformMatrix(ancestor);
    result = multiplyMatrices(m, result);
  }
  return result;
}

/** Check if a feature's effective transform is non-identity */
export function hasAssemblyTransform(features: FeatureNode[], featureId: string): boolean {
  const ancestors = getAncestors(features, featureId);
  for (const ancestor of ancestors) {
    if (ancestor.type !== 'assembly') continue;
    const px = (ancestor.parameters.positionX as number) ?? 0;
    const py = (ancestor.parameters.positionY as number) ?? 0;
    const pz = (ancestor.parameters.positionZ as number) ?? 0;
    const rx = (ancestor.parameters.rotationX as number) ?? 0;
    const ry = (ancestor.parameters.rotationY as number) ?? 0;
    const rz = (ancestor.parameters.rotationZ as number) ?? 0;
    if (px !== 0 || py !== 0 || pz !== 0 || rx !== 0 || ry !== 0 || rz !== 0) return true;
  }
  return false;
}

/** Count immediate children of an assembly */
export function getChildCount(features: FeatureNode[], assemblyId: string): number {
  return features.filter((f) => f.parentId === assemblyId).length;
}
