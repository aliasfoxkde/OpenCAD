import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useMemo, useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { booleanTwo } from '../../cad/kernel/csg-boolean';
import { getConsumedFeatureIds } from '../../lib/feature-to-mesh';
import {
  generateFilletCylinderMesh,
  generateChamferWedgeMesh,
  generateExtrudeProfileMesh,
  generateRevolveProfileMesh,
  generateSweepMesh,
  generateLoftMesh,
} from '../../cad/kernel/mesh-generators';
import { DEG2RAD } from '../../lib/assembly-tree';
import type { FeatureNode } from '../../types/cad';

/** Selected mesh emissive color for glow effect */
const SELECTED_EMISSIVE = '#3b82f6';
const SELECTED_EMISSIVE_INTENSITY = 0.15;
const NON_SELECTED_EMISSIVE_INTENSITY = 0;

/**
 * Hook that smoothly lerps emissive intensity on the material
 * when selection state changes.
 */
function useSelectionGlow(meshRef: React.RefObject<THREE.Mesh | null>, selected: boolean) {
  const targetIntensity = selected ? SELECTED_EMISSIVE_INTENSITY : NON_SELECTED_EMISSIVE_INTENSITY;
  const currentIntensity = useRef(selected ? SELECTED_EMISSIVE_INTENSITY : NON_SELECTED_EMISSIVE_INTENSITY);

  useFrame(() => {
    if (!meshRef.current) return;
    const material = meshRef.current.material;
    if (Array.isArray(material)) return;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;

    // Lerp toward target
    currentIntensity.current += (targetIntensity - currentIntensity.current) * 0.1;
    material.emissiveIntensity = currentIntensity.current;
    if (currentIntensity.current > 0.001) {
      material.emissive.set(SELECTED_EMISSIVE);
    } else {
      material.emissive.set('#000000');
    }
  });

  // Snap immediately on mount
  useEffect(() => {
    currentIntensity.current = targetIntensity;
  }, [targetIntensity]);
}

/** Distance threshold (pixels) to distinguish click from drag */
const CLICK_THRESHOLD = 5;

/** Renders all tessellated CAD geometry using hierarchical assembly groups */
export function CADModel() {
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);

  const consumedIds = useMemo(() => getConsumedFeatureIds(features), [features]);

  return <group>{renderFeatureTree(features, null, selectedIds, consumedIds)}</group>;
}

/** Recursively render features grouped by assembly hierarchy */
function renderFeatureTree(
  features: FeatureNode[],
  parentId: string | null,
  selectedIds: string[],
  consumedIds: Set<string>,
) {
  const children = parentId ? features.filter((f) => f.parentId === parentId) : features.filter((f) => !f.parentId);

  return children.map((f) => {
    if (f.suppressed) return null;

    if (f.type === 'assembly') {
      const px = (f.parameters.positionX as number) ?? 0;
      const py = (f.parameters.positionY as number) ?? 0;
      const pz = (f.parameters.positionZ as number) ?? 0;
      const rx = ((f.parameters.rotationX as number) ?? 0) * DEG2RAD;
      const ry = ((f.parameters.rotationY as number) ?? 0) * DEG2RAD;
      const rz = ((f.parameters.rotationZ as number) ?? 0) * DEG2RAD;

      return (
        <group key={f.id} position={[px, py, pz]} rotation={[rx, ry, rz]}>
          {renderFeatureTree(features, f.id, selectedIds, consumedIds)}
        </group>
      );
    }

    // Skip features consumed by composite features
    if (consumedIds.has(f.id)) return null;

    if (f.type === 'pattern_linear' || f.type === 'pattern_circular' || f.type === 'mirror') {
      return <PatternMeshes key={f.id} feature={f} allFeatures={features} selected={selectedIds.includes(f.id)} />;
    }

    if (f.type === 'boolean_union' || f.type === 'boolean_subtract' || f.type === 'boolean_intersect') {
      return <BooleanMesh key={f.id} feature={f} allFeatures={features} selected={selectedIds.includes(f.id)} />;
    }

    if (f.type === 'shell') {
      return <ShellMesh key={f.id} feature={f} allFeatures={features} selected={selectedIds.includes(f.id)} />;
    }

    if (f.type === 'fillet' || f.type === 'chamfer') {
      return <FilletChamferMesh key={f.id} feature={f} allFeatures={features} selected={selectedIds.includes(f.id)} />;
    }

    if (f.type === 'cut') {
      return <CutMesh key={f.id} feature={f} allFeatures={features} selected={selectedIds.includes(f.id)} />;
    }

    if (f.type === 'revolve_cut') {
      return <RevolveCutMesh key={f.id} feature={f} allFeatures={features} selected={selectedIds.includes(f.id)} />;
    }

    return (
      <FeatureMesh
        key={f.id}
        featureId={f.id}
        type={f.type}
        params={f.parameters}
        selected={selectedIds.includes(f.id)}
        suppressed={f.suppressed}
      />
    );
  });
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
  const meshRef = useRef<THREE.Mesh>(null);
  useSelectionGlow(meshRef, selected);

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
      ref={meshRef}
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
        emissive={selected ? SELECTED_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? SELECTED_EMISSIVE_INTENSITY : 0}
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
  const meshRef = useRef<THREE.Mesh>(null);
  useSelectionGlow(meshRef, selected);

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
      ref={meshRef}
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
        emissive={selected ? SELECTED_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? SELECTED_EMISSIVE_INTENSITY : 0}
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
  const meshRef = useRef<THREE.Mesh>(null);
  useSelectionGlow(meshRef, selected);

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
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ featureId: feature.id }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <meshStandardMaterial
        color={selected ? '#3b82f6' : '#64748b'}
        emissive={selected ? SELECTED_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? SELECTED_EMISSIVE_INTENSITY : 0}
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

interface FilletChamferProps {
  feature: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean };
  allFeatures: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean }[];
  selected: boolean;
}

/** Renders fillet or chamfer result on a target body using CSG */
function FilletChamferMesh({ feature, allFeatures, selected }: FilletChamferProps) {
  if (feature.suppressed) return null;

  const paramsKey = JSON.stringify(feature.parameters);
  const allFeaturesKey = allFeatures.map((f) => `${f.id}:${f.type}:${JSON.stringify(f.parameters)}`).join('|');
  const meshRef = useRef<THREE.Mesh>(null);
  useSelectionGlow(meshRef, selected);

  const geometry = useMemo(() => {
    const targetRef = feature.parameters.targetRef as string;
    if (!targetRef) return null;
    const target = allFeatures.find((f) => f.id === targetRef);
    if (!target || target.suppressed) return null;

    // Get base geometry from createGeometry
    const baseGeo = createGeometry(target.type, target.parameters);
    if (!baseGeo) return null;

    const ox = (target.parameters.originX as number) ?? 0;
    const oy = (target.parameters.originY as number) ?? 0;
    const oz = (target.parameters.originZ as number) ?? 0;
    baseGeo.translate(ox, oy, oz);
    baseGeo.computeBoundingBox();
    const box = baseGeo.boundingBox!;
    const min = box.min;
    const max = box.max;

    const isFillet = feature.type === 'fillet';
    const value = isFillet
      ? Math.max(0.001, (feature.parameters.radius as number) ?? 1)
      : Math.max(0.001, (feature.parameters.distance as number) ?? 0.5);

    // Generate edge decoration meshes along bounding box edges
    const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
    const corners: Array<'+' | '-'> = ['+', '-'];
    const axIdx = (a: 'x' | 'y' | 'z') => (a === 'x' ? 0 : a === 'y' ? 1 : 2);

    let result: THREE.BufferGeometry | null = baseGeo;
    for (const ax of axes) {
      const oa = axes.filter((a) => a !== ax) as Array<'x' | 'y' | 'z'>;
      for (const c1 of corners) {
        for (const c2 of corners) {
          const pos: [number, number, number] = [0, 0, 0];
          pos[axIdx(ax)] = c1 === '+' ? max[ax] : min[ax];
          pos[axIdx(oa[0]!)] = c2 === '+' ? max[oa[0]!] : min[oa[0]!];
          pos[axIdx(oa[1]!)] = c2 === '+' ? max[oa[1]!] : min[oa[1]!];
          const length =
            Math.abs(max[oa[0]!] - min[oa[0]!]) * 2 +
            Math.abs(max[oa[1]!] - min[oa[1]!]) * 2;

          let edgeGeo: THREE.BufferGeometry;
          if (isFillet) {
            const mesh = generateFilletCylinderMesh(value, length, ax, pos);
            edgeGeo = new THREE.BufferGeometry();
            edgeGeo.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
            edgeGeo.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
            edgeGeo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
          } else {
            const mesh = generateChamferWedgeMesh(value, length, ax, pos, c1);
            edgeGeo = new THREE.BufferGeometry();
            edgeGeo.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
            edgeGeo.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
            edgeGeo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
          }

          const next = booleanTwo(result!, edgeGeo, 'union');
          if (!next) continue;
          result.dispose();
          edgeGeo.dispose();
          result = next;
        }
      }
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.type, paramsKey, allFeaturesKey]);

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ featureId: feature.id }}
    >
      <meshStandardMaterial
        color={selected ? '#3b82f6' : '#64748b'}
        emissive={selected ? SELECTED_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? SELECTED_EMISSIVE_INTENSITY : 0}
        transparent={selected}
        opacity={selected ? 0.85 : 1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface CutMeshProps {
  feature: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean };
  allFeatures: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean }[];
  selected: boolean;
}

/** Renders a cut (extruded sketch subtracted from target body) */
function CutMesh({ feature, allFeatures, selected }: CutMeshProps) {
  if (feature.suppressed) return null;

  const paramsKey = JSON.stringify(feature.parameters);
  const allFeaturesKey = allFeatures.map((f) => `${f.id}:${f.type}:${JSON.stringify(f.parameters)}`).join('|');
  const meshRef = useRef<THREE.Mesh>(null);
  useSelectionGlow(meshRef, selected);

  const geometry = useMemo(() => {
    const targetRef = feature.parameters.targetRef as string;
    if (!targetRef) return null;
    const target = allFeatures.find((f) => f.id === targetRef);
    if (!target || target.suppressed) return null;

    const profile = feature.parameters.profile as Array<[number, number]> | undefined;
    if (!profile || profile.length < 3) return null;

    const baseGeo = createGeometry(target.type, target.parameters);
    if (!baseGeo) return null;

    const depth = Math.max(0.001, (feature.parameters.depth as number) ?? 5);
    const plane = (feature.parameters.plane as 'xy' | 'xz' | 'yz') ?? 'xy';
    const direction = (feature.parameters.direction as string) ?? 'normal';
    const ox = (feature.parameters.originX as number) ?? 0;
    const oy = (feature.parameters.originY as number) ?? 0;
    const oz = (feature.parameters.originZ as number) ?? 0;

    let actualDepth = depth;
    if (direction === 'reverse') actualDepth = -depth;

    const cutMeshData = generateExtrudeProfileMesh(profile, actualDepth, plane, [ox, oy, oz]);
    const cutGeo = new THREE.BufferGeometry();
    cutGeo.setAttribute('position', new THREE.BufferAttribute(cutMeshData.vertices, 3));
    cutGeo.setAttribute('normal', new THREE.BufferAttribute(cutMeshData.normals, 3));
    cutGeo.setIndex(new THREE.BufferAttribute(cutMeshData.indices, 1));

    const result = booleanTwo(baseGeo, cutGeo, 'subtract');
    baseGeo.dispose();
    cutGeo.dispose();
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.type, paramsKey, allFeaturesKey]);

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ featureId: feature.id }}
    >
      <meshStandardMaterial
        color={selected ? '#3b82f6' : '#64748b'}
        emissive={selected ? SELECTED_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? SELECTED_EMISSIVE_INTENSITY : 0}
        transparent={selected}
        opacity={selected ? 0.85 : 1}
        side={THREE.DoubleSide}
      />
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
  const meshRef = useRef<THREE.Mesh>(null);
  useSelectionGlow(meshRef, selected);

  const geometry = useMemo(() => {
    if (feature.type === 'boolean_union') {
      const bodyRefs =
        (feature.parameters.bodyRefs as string)
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
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
      const bodyRefs =
        (feature.parameters.bodyRefs as string)
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
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
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ featureId: feature.id }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <meshStandardMaterial
        color={selected ? '#3b82f6' : '#64748b'}
        emissive={selected ? SELECTED_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? SELECTED_EMISSIVE_INTENSITY : 0}
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

interface RevolveCutMeshProps {
  feature: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean };
  allFeatures: { id: string; type: string; parameters: Record<string, unknown>; suppressed: boolean }[];
  selected: boolean;
}

/** Renders a revolve cut (revolved profile subtracted from target body) */
function RevolveCutMesh({ feature, allFeatures, selected }: RevolveCutMeshProps) {
  if (feature.suppressed) return null;

  const paramsKey = JSON.stringify(feature.parameters);
  const allFeaturesKey = allFeatures.map((f) => `${f.id}:${f.type}:${JSON.stringify(f.parameters)}`).join('|');
  const meshRef = useRef<THREE.Mesh>(null);
  useSelectionGlow(meshRef, selected);

  const geometry = useMemo(() => {
    const targetRef = feature.parameters.targetRef as string;
    if (!targetRef) return null;
    const target = allFeatures.find((f) => f.id === targetRef);
    if (!target || target.suppressed) return null;

    const profileStr = feature.parameters.profile as string | undefined;
    if (!profileStr) return null;
    let profile: Array<[number, number]>;
    try {
      profile = JSON.parse(profileStr);
    } catch {
      return null;
    }
    if (!Array.isArray(profile) || profile.length < 2) return null;

    const axis = (feature.parameters.axis as 'x' | 'y' | 'z') ?? 'y';
    const angle = (feature.parameters.angle as number) ?? 360;
    const segments = (feature.parameters.segments as number) ?? 32;
    const ox = (feature.parameters.originX as number) ?? 0;
    const oy = (feature.parameters.originY as number) ?? 0;
    const oz = (feature.parameters.originZ as number) ?? 0;

    const baseGeo = createGeometry(target.type, target.parameters);
    if (!baseGeo) return null;

    const cutMeshData = generateRevolveProfileMesh(profile, angle, axis, segments, [ox, oy, oz]);
    const cutGeo = new THREE.BufferGeometry();
    cutGeo.setAttribute('position', new THREE.BufferAttribute(cutMeshData.vertices, 3));
    cutGeo.setAttribute('normal', new THREE.BufferAttribute(cutMeshData.normals, 3));
    cutGeo.setIndex(new THREE.BufferAttribute(cutMeshData.indices, 1));

    const result = booleanTwo(baseGeo, cutGeo, 'subtract');
    baseGeo.dispose();
    cutGeo.dispose();
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.type, paramsKey, allFeaturesKey]);

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      userData={{ featureId: feature.id }}
    >
      <meshStandardMaterial
        color={selected ? '#3b82f6' : '#64748b'}
        emissive={selected ? SELECTED_EMISSIVE : '#000000'}
        emissiveIntensity={selected ? SELECTED_EMISSIVE_INTENSITY : 0}
        transparent={selected}
        opacity={selected ? 0.85 : 1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function createGeometry(type: string, params: Record<string, unknown>): THREE.BufferGeometry | null {
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
    case 'mesh_import': {
      const vertices = params._vertices as number[] | undefined;
      const indices = params._indices as number[] | undefined;
      if (!vertices || !indices || vertices.length < 3 || indices.length < 3) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }
    case 'extrude_sketch': {
      const profile = params.profile as Array<[number, number]> | undefined;
      if (!profile || profile.length < 3) return null;
      const depth = Math.max(0.001, (params.depth as number) ?? 5);
      const direction = (params.direction as string) ?? 'normal';
      const plane = (params.plane as 'xy' | 'xz' | 'yz') ?? 'xy';
      const ox = (params.originX as number) ?? 0;
      const oy = (params.originY as number) ?? 0;
      const oz = (params.originZ as number) ?? 0;
      let actualDepth = depth;
      if (direction === 'reverse') actualDepth = -depth;
      else if (direction === 'symmetric') actualDepth = depth / 2;
      const mesh = generateExtrudeProfileMesh(profile, actualDepth, plane, [ox, oy, oz]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(mesh.vertices), 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from(mesh.normals), 3));
      geo.setIndex(Array.from(mesh.indices));
      return geo;
    }
    case 'revolve_sketch': {
      const profile = params.profile as Array<[number, number]> | undefined;
      if (!profile || profile.length < 2) return null;
      const axis = (params.axis as 'x' | 'y' | 'z') ?? 'y';
      const angle = (params.angle as number) ?? 360;
      const segments = (params.segments as number) ?? 32;
      const ox = (params.originX as number) ?? 0;
      const oy = (params.originY as number) ?? 0;
      const oz = (params.originZ as number) ?? 0;
      const mesh = generateRevolveProfileMesh(profile, angle, axis, segments, [ox, oy, oz]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(mesh.vertices), 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from(mesh.normals), 3));
      geo.setIndex(Array.from(mesh.indices));
      return geo;
    }
    case 'sweep': {
      const profileStr = params.profile as string | undefined;
      const pathStr = params.path as string | undefined;
      if (!profileStr || !pathStr) return null;
      let profile: Array<[number, number]>;
      let path: Array<[number, number, number]>;
      try {
        profile = JSON.parse(profileStr);
        path = JSON.parse(pathStr);
      } catch {
        return null;
      }
      if (!Array.isArray(profile) || !Array.isArray(path) || profile.length < 3 || path.length < 2) return null;
      const segments = (params.segments as number) ?? 16;
      const mesh = generateSweepMesh(profile, path, segments);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(mesh.vertices), 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from(mesh.normals), 3));
      geo.setIndex(Array.from(mesh.indices));
      return geo;
    }
    case 'loft': {
      const profilesStr = params.profiles as string | undefined;
      if (!profilesStr) return null;
      let profiles: Array<Array<[number, number, number]>>;
      try {
        profiles = JSON.parse(profilesStr);
      } catch {
        return null;
      }
      if (!Array.isArray(profiles) || profiles.length < 2) return null;
      const mesh = generateLoftMesh(profiles);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(mesh.vertices), 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from(mesh.normals), 3));
      geo.setIndex(Array.from(mesh.indices));
      return geo;
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}
