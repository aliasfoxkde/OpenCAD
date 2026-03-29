import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
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
  const displayMode = useViewStore((s) => s.displayMode);

  if (suppressed) return null;

  // Serialize params for stable dependency
  const paramsKey = JSON.stringify(params);
  const geometry = useMemo(() => createGeometry(type, params), [type, paramsKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  if (!geometry) return null;

  const posX = (params.originX as number) ?? 0;
  const posY = (params.originY as number) ?? 0;
  const posZ = (params.originZ as number) ?? 0;

  const isWireframe = displayMode === 'wireframe';
  const showEdges = displayMode === 'shaded_edges';

  return (
    <mesh geometry={geometry} position={[posX, posY, posZ]} castShadow receiveShadow>
      <meshStandardMaterial
        color={selected ? '#3b82f6' : '#64748b'}
        transparent={selected}
        opacity={selected ? 0.85 : 1}
        wireframe={isWireframe}
        side={THREE.DoubleSide}
      />
      {showEdges && (
        <meshBasicMaterial
          color={selected ? '#60a5fa' : '#475569'}
          wireframe
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      )}
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
