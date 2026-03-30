import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useMemo, useRef, useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

/** Distance threshold (pixels) to distinguish click from drag */
const CLICK_THRESHOLD = 5;

/** Renders all tessellated CAD geometry */
export function CADModel() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);

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

function FeatureMesh({ featureId, type, params, selected, suppressed }: FeatureMeshProps) {
  const displayMode = useViewStore((s) => s.displayMode);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

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

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!pointerDownPos.current) return;
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pointerDownPos.current = null;
      if (dist > CLICK_THRESHOLD) return;

      const { select } = useCADStore.getState();
      if (e.shiftKey) {
        // Toggle selection with Shift
        const current = useCADStore.getState().selectedIds;
        if (current.includes(featureId)) {
          select(current.filter((id) => id !== featureId));
        } else {
          select([...current, featureId]);
        }
      } else {
        select([featureId]);
      }
    },
    [featureId],
  );

  return (
    <mesh
      geometry={geometry}
      position={[posX, posY, posZ]}
      castShadow
      receiveShadow
      userData={{ featureId }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
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
    case 'hole': {
      const diameter = Math.max(0.001, (params.diameter as number) ?? 5);
      const depth = Math.max(0.001, (params.depth as number) ?? 10);
      return new THREE.CylinderGeometry(diameter / 2, diameter / 2, depth, 32);
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}
