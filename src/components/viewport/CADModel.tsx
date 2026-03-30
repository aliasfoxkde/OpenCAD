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

  // Separate simple features from pattern features
  const { simpleFeatures, patternFeatures } = useMemo(() => {
    const simple: typeof features = [];
    const patterns: typeof features = [];
    for (const f of features) {
      if (f.type === 'pattern_linear' || f.type === 'pattern_circular') {
        patterns.push(f);
      } else {
        simple.push(f);
      }
    }
    return { simpleFeatures: simple, patternFeatures: patterns };
  }, [features]);

  return (
    <group>
      {simpleFeatures.map((feature) => (
        <FeatureMesh
          key={feature.id}
          featureId={feature.id}
          type={feature.type}
          params={feature.parameters}
          selected={selectedIds.includes(feature.id)}
          suppressed={feature.suppressed}
        />
      ))}
      {patternFeatures.map((feature) => (
        <PatternMeshes
          key={feature.id}
          feature={feature}
          allFeatures={features}
          selected={selectedIds.includes(feature.id)}
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

/** Compute transforms for a linear pattern */
function getLinearPatternTransforms(params: Record<string, unknown>): THREE.Matrix4[] {
  const direction = (params.direction as string) ?? 'x';
  const count = Math.max(1, Math.round((params.count as number) ?? 3));
  const spacing = (params.spacing as number) ?? 5;

  const transforms: THREE.Matrix4[] = [];
  for (let i = 0; i < count; i++) {
    const offset = i * spacing;
    const m = new THREE.Matrix4();
    switch (direction) {
      case 'y':
        m.setPosition(0, offset, 0);
        break;
      case 'z':
        m.setPosition(0, 0, offset);
        break;
      default: // 'x'
        m.setPosition(offset, 0, 0);
        break;
    }
    transforms.push(m);
  }
  return transforms;
}

/** Compute transforms for a circular pattern */
function getCircularPatternTransforms(params: Record<string, unknown>): THREE.Matrix4[] {
  const axis = (params.axis as string) ?? 'z';
  const count = Math.max(1, Math.round((params.count as number) ?? 6));
  const totalAngle = ((params.angle as number) ?? 360) * (Math.PI / 180);

  const transforms: THREE.Matrix4[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * totalAngle;
    const m = new THREE.Matrix4();
    switch (axis) {
      case 'x':
        m.makeRotationX(angle);
        break;
      case 'y':
        m.makeRotationY(angle);
        break;
      default: // 'z'
        m.makeRotationZ(angle);
        break;
    }
    transforms.push(m);
  }
  return transforms;
}

interface PatternMeshesProps {
  feature: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean };
  allFeatures: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean }[];
  selected: boolean;
}

/** Renders pattern instances as transformed copies of the referenced feature */
function PatternMeshes({ feature, allFeatures, selected }: PatternMeshesProps) {
  if (feature.suppressed) return null;

  const paramsKey = JSON.stringify(feature.parameters);
  const allFeaturesKey = allFeatures.map((f) => `${f.id}:${f.type}:${JSON.stringify(f.parameters)}`).join('|');

  const instances = useMemo(() => {
    const featureRef = feature.parameters.featureRef as string;
    if (!featureRef) return null;

    const refFeature = allFeatures.find((f) => f.id === featureRef);
    if (!refFeature || refFeature.suppressed) return null;

    const baseGeometry = createGeometry(refFeature.type, refFeature.parameters);
    if (!baseGeometry) return null;

    const transforms =
      feature.type === 'pattern_linear'
        ? getLinearPatternTransforms(feature.parameters)
        : getCircularPatternTransforms(feature.parameters);

    const refPosX = (refFeature.parameters.originX as number) ?? 0;
    const refPosY = (refFeature.parameters.originY as number) ?? 0;
    const refPosZ = (refFeature.parameters.originZ as number) ?? 0;

    return { baseGeometry, transforms, refPos: [refPosX, refPosY, refPosZ] as [number, number, number] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, allFeaturesKey, feature.type]);

  if (!instances) return null;

  const displayMode = useViewStore((s) => s.displayMode);
  const isWireframe = displayMode === 'wireframe';
  const showEdges = displayMode === 'shaded_edges';

  return (
    <>
      {instances.transforms.map((transform, i) => (
        <PatternInstance
          key={i}
          featureId={feature.id}
          geometry={instances.baseGeometry}
          transform={transform}
          refPos={instances.refPos}
          selected={selected}
          isWireframe={isWireframe}
          showEdges={showEdges}
        />
      ))}
    </>
  );
}

function PatternInstance({
  featureId,
  geometry,
  transform,
  refPos,
  selected,
  isWireframe,
  showEdges,
}: {
  featureId: string;
  geometry: THREE.BufferGeometry;
  transform: THREE.Matrix4;
  refPos: [number, number, number];
  selected: boolean;
  isWireframe: boolean;
  showEdges: boolean;
}) {
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

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
      position={refPos}
      matrixAutoUpdate={false}
      matrix={transform}
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
