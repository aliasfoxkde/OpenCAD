/**
 * DimensionAnnotation — renders persistent measurement labels in the 3D viewport.
 * Uses drei Html for automatic 3D-to-2D projection.
 */

import { useRef, useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useViewStore } from '../../stores/view-store';
import { getAnnotationLabel, getAnnotationMidpoint } from '../../lib/annotations';
import type { DimensionAnnotation } from '../../lib/annotations';

/** R3F component that renders all annotations */
export function DimensionAnnotations() {
  const annotations = useViewStore((s) => s.annotations);
  const removeAnnotation = useViewStore((s) => s.removeAnnotation);

  return (
    <>
      {annotations.map((ann) => (
        <AnnotationItem key={ann.id} annotation={ann} onRemove={() => removeAnnotation(ann.id)} />
      ))}
    </>
  );
}

function AnnotationItem({ annotation, onRemove }: { annotation: DimensionAnnotation; onRemove: () => void }) {
  const label = getAnnotationLabel(annotation);
  const mid = useMemo(() => getAnnotationMidpoint(annotation), [annotation]);
  const groupRef = useRef<THREE.Group>(null);

  const color = annotation.type === 'distance' ? '#22d3ee' : annotation.type === 'radius' ? '#a78bfa' : '#f472b6';

  // Build dashed leader line
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Remove old line
    const old = group.getObjectByName('leader') as THREE.Line | undefined;
    if (old) {
      group.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
    }

    const points = [new THREE.Vector3(...annotation.p1), new THREE.Vector3(...annotation.p2)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.2,
      gapSize: 0.1,
      opacity: 0.6,
      transparent: true,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    line.name = 'leader';
    group.add(line);

    return () => {
      if (group.getObjectByName('leader')) {
        group.remove(line);
        geometry.dispose();
        material.dispose();
      }
    };
  }, [annotation.p1, annotation.p2, color]);

  return (
    <group ref={groupRef}>
      <Html position={mid} center style={{ pointerEvents: 'auto' }}>
        <div
          style={{
            background: 'rgba(15,23,42,0.85)',
            border: `1px solid ${color}40`,
            borderRadius: 3,
            padding: '1px 6px',
            fontSize: 10,
            fontFamily: 'monospace',
            color,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Click to remove"
          onClick={onRemove}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}
