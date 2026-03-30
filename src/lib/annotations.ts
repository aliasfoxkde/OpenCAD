/**
 * Dimension annotations — persistent measurement labels in the 3D viewport.
 */

export type AnnotationType = 'distance' | 'radius' | 'diameter';

export interface DimensionAnnotation {
  id: string;
  type: AnnotationType;
  /** First point (or center for radius/diameter) */
  p1: [number, number, number];
  /** Second point (or edge point for radius/diameter) */
  p2: [number, number, number];
  /** Label override; computed from type if omitted */
  label?: string;
}

/** Compute the distance between two 3D points */
function distance(a: [number, number, number], b: [number, number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Format a number for annotation display */
function formatDist(d: number): string {
  if (Math.abs(d) < 0.001) return '0';
  if (Math.abs(d) >= 100) return `${d.toFixed(1)}`;
  if (Math.abs(d) >= 1) return `${d.toFixed(2)}`;
  return `${d.toFixed(3)}`;
}

/** Get the display label for an annotation */
export function getAnnotationLabel(annotation: DimensionAnnotation): string {
  if (annotation.label) return annotation.label;

  switch (annotation.type) {
    case 'distance': {
      const d = distance(annotation.p1, annotation.p2);
      return `${formatDist(d)} mm`;
    }
    case 'radius': {
      const r = distance(annotation.p1, annotation.p2);
      return `R${formatDist(r)}`;
    }
    case 'diameter': {
      const r = distance(annotation.p1, annotation.p2);
      return `\u00D8${formatDist(r * 2)}`;
    }
  }
}

/** Get the midpoint between two 3D points */
export function getAnnotationMidpoint(annotation: DimensionAnnotation): [number, number, number] {
  return [
    (annotation.p1[0] + annotation.p2[0]) / 2,
    (annotation.p1[1] + annotation.p2[1]) / 2,
    (annotation.p1[2] + annotation.p2[2]) / 2,
  ];
}

/** Factory: create a distance annotation */
export function createDistanceAnnotation(
  p1: [number, number, number],
  p2: [number, number, number],
): DimensionAnnotation {
  return {
    id: crypto.randomUUID(),
    type: 'distance',
    p1,
    p2,
  };
}

/** Factory: create a radius annotation */
export function createRadiusAnnotation(
  center: [number, number, number],
  edgePoint: [number, number, number],
): DimensionAnnotation {
  return {
    id: crypto.randomUUID(),
    type: 'radius',
    p1: center,
    p2: edgePoint,
  };
}

/** Factory: create a diameter annotation */
export function createDiameterAnnotation(
  p1: [number, number, number],
  p2: [number, number, number],
): DimensionAnnotation {
  return {
    id: crypto.randomUUID(),
    type: 'diameter',
    p1,
    p2,
  };
}
