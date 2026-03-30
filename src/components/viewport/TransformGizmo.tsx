import { useRef, useEffect, useCallback } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCADStore } from '../../stores/cad-store';

/**
 * 3D Transform Gizmo — attaches to the selected feature's position
 * and allows drag-to-reposition via originX/Y/Z parameters.
 * Only visible when a single feature is selected and tool is 'select'.
 */
export function TransformGizmo() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const activeTool = useCADStore((s) => s.activeTool);
  const updateFeature = useCADStore((s) => s.updateFeature);

  const meshRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const dragging = useRef(false);

  const selectedFeature =
    selectedIds.length === 1
      ? features.find((f) => f.id === selectedIds[0])
      : null;

  const posX = selectedFeature
    ? ((selectedFeature.parameters.originX as number) ?? 0)
    : 0;
  const posY = selectedFeature
    ? ((selectedFeature.parameters.originY as number) ?? 0)
    : 0;
  const posZ = selectedFeature
    ? ((selectedFeature.parameters.originZ as number) ?? 0)
    : 0;

  const isGizmoVisible = !!selectedFeature && activeTool === 'select';

  // Sync position from feature params to mesh
  useEffect(() => {
    if (meshRef.current && isGizmoVisible) {
      meshRef.current.position.set(posX, posY, posZ);
    }
  }, [posX, posY, posZ, isGizmoVisible]);

  const handleObjectChange = useCallback(() => {
    if (!meshRef.current || !selectedFeature || !dragging.current) return;

    const pos = meshRef.current.position;
    updateFeature(selectedFeature.id, {
      parameters: {
        ...selectedFeature.parameters,
        originX: Math.round(pos.x * 1000) / 1000,
        originY: Math.round(pos.y * 1000) / 1000,
        originZ: Math.round(pos.z * 1000) / 1000,
      },
    });
  }, [selectedFeature, updateFeature]);

  if (!isGizmoVisible) return null;

  return (
    <TransformControls
      ref={controlsRef}
      mode="translate"
      onMouseDown={() => { dragging.current = true; }}
      onMouseUp={() => { dragging.current = false; }}
      onObjectChange={handleObjectChange}
    >
      <mesh ref={meshRef} position={[posX, posY, posZ]} visible={false}>
        <boxGeometry args={[0.001, 0.001, 0.001]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </TransformControls>
  );
}
