import { useCADStore } from '../../stores/cad-store';
import { useMemo } from 'react';
import * as THREE from 'three';

/** Renders all tessellated CAD geometry */
export function CADModel() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);

  // For now, render placeholder primitives for each feature
  // This will be replaced with actual tessellation from the CAD kernel
  return (
    <group>
      {features.map((feature) => (
        <FeatureMesh
          key={feature.id}
          featureId={feature.id}
          type={feature.type}
          params={feature.parameters}
          selected={selectedIds.includes(feature.id)}
          suppressed={feature.suppressed}
        />
      ))}
    </group>
  );
}

interface FeatureMeshProps {
  featureId: string;
  type: string;
  params: Record<string, unknown>;
  selected: boolean;
  suppressed: boolean;
}

function FeatureMesh({ type, params, selected, suppressed }: FeatureMeshProps) {
  if (suppressed) return null;

  const geometry = useMemo(() => createGeometry(type, params), [type, params]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={selected ? '#3b82f6' : '#64748b'}
        transparent={selected}
        opacity={selected ? 0.85 : 1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function createGeometry(
  type: string,
  params: Record<string, unknown>,
): THREE.BufferGeometry | null {
  switch (type) {
    case 'extrude': {
      const width = (params.width as number) ?? 1;
      const height = (params.height as number) ?? 1;
      const depth = (params.depth as number) ?? 1;
      return new THREE.BoxGeometry(width, height, depth);
    }
    case 'revolve': {
      const radius = Math.max(0.001, (params.radius as number) ?? 0.5);
      const height = (params.height as number) ?? 1;
      return new THREE.CylinderGeometry(radius, radius, height, 32);
    }
    case 'sphere': {
      const radius = Math.max(0.001, (params.radius as number) ?? 0.5);
      return new THREE.SphereGeometry(radius, 32, 16);
    }
    case 'cone': {
      const radius = Math.max(0.001, (params.radius as number) ?? 0.5);
      const height = (params.height as number) ?? 1;
      return new THREE.ConeGeometry(radius, height, 32);
    }
    case 'torus': {
      const radius = Math.max(0.001, (params.radius as number) ?? 0.5);
      const tube = Math.max(0.001, (params.tube as number) ?? 0.15);
      return new THREE.TorusGeometry(radius, tube, 16, 48);
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}
