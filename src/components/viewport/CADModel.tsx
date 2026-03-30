import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useMemo, useRef, useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { booleanTwo } from '../../cad/kernel/csg-boolean';

/** Distance threshold (pixels) to distinguish click from drag */
const CLICK_THRESHOLD = 5;

/** Renders all tessellated CAD geometry */
export function CADModel() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);

  // Separate simple features from pattern/mirror/boolean/shell features
  const { simpleFeatures, patternFeatures, booleanFeatures, shellFeatures } = useMemo(() => {
    const simple: typeof features = [];
    const patterns: typeof features = [];
    const booleans: typeof features = [];
    const shells: typeof features = [];
    for (const f of features) {
      if (f.type === 'pattern_linear' || f.type === 'pattern_circular' || f.type === 'mirror') {
        patterns.push(f);
      } else if (f.type === 'boolean_union' || f.type === 'boolean_subtract' || f.type === 'boolean_intersect') {
        booleans.push(f);
      } else if (f.type === 'shell') {
        shells.push(f);
      } else {
        simple.push(f);
      }
    }
    return { simpleFeatures: simple, patternFeatures: patterns, booleanFeatures: booleans, shellFeatures: shells };
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
      {booleanFeatures.map((feature) => (
        <BooleanMesh
          key={feature.id}
          feature={feature}
          allFeatures={features}
          selected={selectedIds.includes(feature.id)}
        />
      ))}
      {shellFeatures.map((feature) => (
        <ShellMesh
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

/** Compute transform for a mirror (reflection across a plane) */
function getMirrorTransform(params: Record<string, unknown>): THREE.Matrix4[] {
  const plane = (params.plane as string) ?? 'yz';
  const m = new THREE.Matrix4();
  switch (plane) {
    case 'xz':
      m.makeScale(1, -1, 1);
      break;
    case 'xy':
      m.makeScale(1, 1, -1);
      break;
    default: // 'yz' — mirror across YZ plane (negate X)
      m.makeScale(-1, 1, 1);
      break;
  }
  return [m];
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

    let transforms: THREE.Matrix4[];
    if (feature.type === 'pattern_linear') {
      transforms = getLinearPatternTransforms(feature.parameters);
    } else if (feature.type === 'pattern_circular') {
      transforms = getCircularPatternTransforms(feature.parameters);
    } else {
      transforms = getMirrorTransform(feature.parameters);
    }

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

interface ShellMeshProps {
  feature: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean };
  allFeatures: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean }[];
  selected: boolean;
}

/** Renders the result of shelling out a referenced body */
function ShellMesh({ feature, allFeatures, selected }: ShellMeshProps) {
  if (feature.suppressed) return null;

  const paramsKey = JSON.stringify(feature.parameters);
  const allFeaturesKey = allFeatures.map((f) => `${f.id}:${f.type}:${JSON.stringify(f.parameters)}`).join('|');

  const geometry = useMemo(() => {
    const targetRef = feature.parameters.targetRef as string;
    if (!targetRef) return null;

    const targetFeature = allFeatures.find((f) => f.id === targetRef);
    if (!targetFeature || targetFeature.suppressed) return null;

    const outerGeo = createGeometry(targetFeature.type, targetFeature.parameters);
    if (!outerGeo) return null;

    const thickness = Math.max(0.001, (feature.parameters.thickness as number) ?? 1);

    const tox = (targetFeature.parameters.originX as number) ?? 0;
    const toy = (targetFeature.parameters.originY as number) ?? 0;
    const toz = (targetFeature.parameters.originZ as number) ?? 0;
    outerGeo.translate(tox, toy, toz);

    // Create inner geometry by scaling down from center
    const innerGeo = createGeometry(targetFeature.type, targetFeature.parameters);
    if (!innerGeo) return null;

    // Compute bounding box to get center
    outerGeo.computeBoundingBox();
    const box = outerGeo.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Scale inner geometry toward center by thickness on each side
    innerGeo.translate(tox, toy, toz);
    const dx = Math.max(0.5, box.max.x - box.min.x - 2 * thickness) / Math.max(0.001, box.max.x - box.min.x);
    const dy = Math.max(0.5, box.max.y - box.min.y - 2 * thickness) / Math.max(0.001, box.max.y - box.min.y);
    const dz = Math.max(0.5, box.max.z - box.min.z - 2 * thickness) / Math.max(0.001, box.max.z - box.min.z);

    innerGeo.translate(-center.x, -center.y, -center.z);
    innerGeo.scale(dx, dy, dz);
    innerGeo.translate(center.x, center.y, center.z);

    const result = booleanTwo(outerGeo, innerGeo, 'subtract');
    return result ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, allFeaturesKey, feature.type]);

  if (!geometry) return null;

  const displayMode = useViewStore((s) => s.displayMode);
  const isWireframe = displayMode === 'wireframe';
  const showEdges = displayMode === 'shaded_edges';
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!pointerDownPos.current) return;
      const ddx = e.clientX - pointerDownPos.current.x;
      const ddy = e.clientY - pointerDownPos.current.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      pointerDownPos.current = null;
      if (dist > CLICK_THRESHOLD) return;

      const { select } = useCADStore.getState();
      if (e.shiftKey) {
        const current = useCADStore.getState().selectedIds;
        if (current.includes(feature.id)) {
          select(current.filter((id) => id !== feature.id));
        } else {
          select([...current, feature.id]);
        }
      } else {
        select([feature.id]);
      }
    },
    [feature.id],
  );

  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ featureId: feature.id }}
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

interface BooleanMeshProps {
  feature: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean };
  allFeatures: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean }[];
  selected: boolean;
}

/** Renders the result of a boolean operation on referenced features */
function BooleanMesh({ feature, allFeatures, selected }: BooleanMeshProps) {
  if (feature.suppressed) return null;

  const paramsKey = JSON.stringify(feature.parameters);
  const allFeaturesKey = allFeatures.map((f) => `${f.id}:${f.type}:${JSON.stringify(f.parameters)}`).join('|');

  const geometry = useMemo(() => {
    if (feature.type === 'boolean_union') {
      const bodyRefs = (feature.parameters.bodyRefs as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const geos: THREE.BufferGeometry[] = [];
      for (const refId of bodyRefs) {
        const ref = allFeatures.find((f) => f.id === refId);
        if (!ref || ref.suppressed) continue;
        const g = createGeometry(ref.type, ref.parameters);
        if (!g) continue;
        const ox = (ref.parameters.originX as number) ?? 0;
        const oy = (ref.parameters.originY as number) ?? 0;
        const oz = (ref.parameters.originZ as number) ?? 0;
        g.translate(ox, oy, oz);
        geos.push(g);
      }
      if (geos.length === 0) return null;
      if (geos.length === 1) return geos[0]!;

      let result: THREE.BufferGeometry | null = geos[0]!;
      for (let i = 1; i < geos.length; i++) {
        const next = booleanTwo(result!, geos[i]!, 'union');
        if (!next) return null;
        result = next;
      }
      return result;
    }

    if (feature.type === 'boolean_subtract') {
      const targetRef = feature.parameters.targetRef as string;
      const toolRef = feature.parameters.toolRef as string;
      if (!targetRef || !toolRef) return null;

      const targetFeature = allFeatures.find((f) => f.id === targetRef);
      const toolFeature = allFeatures.find((f) => f.id === toolRef);
      if (!targetFeature || targetFeature.suppressed) return null;
      if (!toolFeature || toolFeature.suppressed) return null;

      const tGeo = createGeometry(targetFeature.type, targetFeature.parameters);
      const uGeo = createGeometry(toolFeature.type, toolFeature.parameters);
      if (!tGeo || !uGeo) return null;

      const tox = (targetFeature.parameters.originX as number) ?? 0;
      const toy = (targetFeature.parameters.originY as number) ?? 0;
      const toz = (targetFeature.parameters.originZ as number) ?? 0;
      tGeo.translate(tox, toy, toz);

      const uox = (toolFeature.parameters.originX as number) ?? 0;
      const uoy = (toolFeature.parameters.originY as number) ?? 0;
      const uoz = (toolFeature.parameters.originZ as number) ?? 0;
      uGeo.translate(uox, uoy, uoz);

      const result = booleanTwo(tGeo, uGeo, 'subtract');
      return result ?? null;
    }

    if (feature.type === 'boolean_intersect') {
      const bodyRefs = (feature.parameters.bodyRefs as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const geos: THREE.BufferGeometry[] = [];
      for (const refId of bodyRefs) {
        const ref = allFeatures.find((f) => f.id === refId);
        if (!ref || ref.suppressed) continue;
        const g = createGeometry(ref.type, ref.parameters);
        if (!g) continue;
        const ox = (ref.parameters.originX as number) ?? 0;
        const oy = (ref.parameters.originY as number) ?? 0;
        const oz = (ref.parameters.originZ as number) ?? 0;
        g.translate(ox, oy, oz);
        geos.push(g);
      }
      if (geos.length < 2) return null;

      let result: THREE.BufferGeometry | null = geos[0]!;
      for (let i = 1; i < geos.length; i++) {
        const next = booleanTwo(result!, geos[i]!, 'intersect');
        if (!next) return null;
        result = next;
      }
      return result;
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, allFeaturesKey, feature.type]);

  if (!geometry) return null;

  const displayMode = useViewStore((s) => s.displayMode);
  const isWireframe = displayMode === 'wireframe';
  const showEdges = displayMode === 'shaded_edges';
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
        if (current.includes(feature.id)) {
          select(current.filter((id) => id !== feature.id));
        } else {
          select([...current, feature.id]);
        }
      } else {
        select([feature.id]);
      }
    },
    [feature.id],
  );

  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ featureId: feature.id }}
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
