import { useRef, useEffect, useCallback } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';

/**
 * 3D Transform Gizmo — attaches to the selected feature's position
 * and allows drag-to-reposition via originX/Y/Z parameters.
 * Only visible when a single feature is selected and tool is 'select'.
 * Snaps to grid when snap mode is enabled.
 */
export function TransformGizmo() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const activeTool = useCADStore((s) => s.activeTool);
  const updateFeature = useCADStore((s) => s.updateFeature);
  const snapToGrid = useViewStore((s) => s.snapToGrid);
  const gridSnapSize = useViewStore((s) => s.gridSnapSize);

  const meshRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const dragging = useRef(false);

  const selectedFeature =
    selectedIds.length === 1
      ? features.find((f) => f.id === selectedIds[0])
      : null;

  // Assembly features use positionX/Y/Z, other features use originX/Y/Z
  const isAssembly = selectedFeature?.type === 'assembly';
  const posKeyX = isAssembly ? 'positionX' : 'originX';
  const posKeyY = isAssembly ? 'positionY' : 'originY';
  const posKeyZ = isAssembly ? 'positionZ' : 'originZ';

  const posX = selectedFeature
    ? ((selectedFeature.parameters[posKeyX] as number) ?? 0)
    : 0;
  const posY = selectedFeature
    ? ((selectedFeature.parameters[posKeyY] as number) ?? 0)
    : 0;
  const posZ = selectedFeature
    ? ((selectedFeature.parameters[posKeyZ] as number) ?? 0)
    : 0;

  const isGizmoVisible = !!selectedFeature && activeTool === 'select';

  // Sync position from feature params to mesh
  useEffect(() => {
    if (meshRef.current && isGizmoVisible) {
      meshRef.current.position.set(posX, posY, posZ);
    }
  }, [posX, posY, posZ, isGizmoVisible]);

  const snapValue = useCallback((v: number): number => {
    if (!snapToGrid) return v;
    return Math.round(v / gridSnapSize) * gridSnapSize;
  }, [snapToGrid, gridSnapSize]);

  const handleObjectChange = useCallback(() => {
    if (!meshRef.current || !selectedFeature || !dragging.current) return;

    const pos = meshRef.current.position;
    updateFeature(selectedFeature.id, {
      parameters: {
        ...selectedFeature.parameters,
        [posKeyX]: snapValue(pos.x),
        [posKeyY]: snapValue(pos.y),
        [posKeyZ]: snapValue(pos.z),
      },
    });
  }, [selectedFeature, updateFeature, snapValue, posKeyX, posKeyY, posKeyZ]);

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
