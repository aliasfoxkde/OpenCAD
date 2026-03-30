/**
 * Converts feature parameters to MeshData for export.
 *
 * Uses the same generators as CADModel but returns MeshData
 * instead of Three.js geometries.
 */

import type { MeshData, FeatureNode } from '../types/cad';
import {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateConeMesh,
  generateTorusMesh,
  generateHoleMesh,
} from '../cad/kernel/mesh-generators';
import * as THREE from 'three';
import { booleanTwo } from '../cad/kernel/csg-boolean';

/** Transform mesh vertices by a 4x4 matrix (3x4: row-major, translation in column 3) */
function transformMesh(mesh: MeshData, matrix: number[]): MeshData {
  const m = matrix;
  const vertices = new Float32Array(mesh.vertices.length);
  const normals = new Float32Array(mesh.normals.length);

  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = mesh.vertices[i]!;
    const y = mesh.vertices[i + 1]!;
    const z = mesh.vertices[i + 2]!;
    vertices[i] = m[0]! * x + m[1]! * y + m[2]! * z + m[3]!;
    vertices[i + 1] = m[4]! * x + m[5]! * y + m[6]! * z + m[7]!;
    vertices[i + 2] = m[8]! * x + m[9]! * y + m[10]! * z + m[11]!;
  }

  for (let i = 0; i < mesh.normals.length; i += 3) {
    const nx = mesh.normals[i]!;
    const ny = mesh.normals[i + 1]!;
    const nz = mesh.normals[i + 2]!;
    normals[i] = m[0]! * nx + m[1]! * ny + m[2]! * nz;
    normals[i + 1] = m[4]! * nx + m[5]! * ny + m[6]! * nz;
    normals[i + 2] = m[8]! * nx + m[9]! * ny + m[10]! * nz;
  }

  return {
    vertices,
    normals,
    indices: new Uint32Array(mesh.indices),
    featureId: mesh.featureId,
  };
}

/** Build translation matrix for linear pattern instance */
function translationMatrix(dx: number, dy: number, dz: number): number[] {
  return [1, 0, 0, dx, 0, 1, 0, dy, 0, 0, 1, dz];
}

/** Build rotation matrix around an axis */
function rotationMatrix(axis: 'x' | 'y' | 'z', angle: number): number[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  switch (axis) {
    case 'x': return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0];
    case 'y': return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0];
    case 'z': return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0];
  }
}

/** Build reflection matrix across a plane */
function reflectionMatrix(plane: string): number[] {
  switch (plane) {
    case 'xz': return [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0];
    case 'xy': return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0];
    default:  return [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; // 'yz'
  }
}

/** Convert MeshData to THREE.BufferGeometry */
function meshDataToGeometry(mesh: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const vertexCount = mesh.vertices.length / 3;
  geo.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  // Add UV attribute — required by three-bvh-csg Brush.prepareGeometry()
  const uvs = new Float32Array(vertexCount * 2);
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  return geo;
}

/** Convert THREE.BufferGeometry to MeshData */
function geometryToMeshData(geo: THREE.BufferGeometry, featureId: string): MeshData {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const norm = geo.getAttribute('normal') as THREE.BufferAttribute;
  const idx = geo.getIndex();
  return {
    vertices: new Float32Array(pos.array),
    normals: norm ? new Float32Array(norm.array) : new Float32Array(pos.array.length),
    indices: idx ? new Uint32Array(idx.array) : new Uint32Array(pos.count),
    featureId,
  };
}

/** Convert a single feature to MeshData, or null if unsupported */
export function featureToMesh(feature: FeatureNode, allFeatures?: FeatureNode[]): MeshData | null {
  switch (feature.type) {
    case 'extrude': {
      const width = (feature.parameters.width as number) ?? 1;
      const height = (feature.parameters.height as number) ?? 1;
      const depth = (feature.parameters.depth as number) ?? 1;
      const mesh = generateBoxMesh(width, height, depth);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'revolve': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const height = (feature.parameters.height as number) ?? 1;
      const mesh = generateCylinderMesh(radius, height);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'sphere': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const mesh = generateSphereMesh(radius);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'cone': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const height = (feature.parameters.height as number) ?? 1;
      const mesh = generateConeMesh(radius, height);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'torus': {
      const radius = Math.max(0.001, (feature.parameters.radius as number) ?? 0.5);
      const tube = Math.max(0.001, (feature.parameters.tube as number) ?? 0.15);
      const mesh = generateTorusMesh(radius, tube);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'hole': {
      const diameter = Math.max(0.001, (feature.parameters.diameter as number) ?? 5);
      const depth = Math.max(0.001, (feature.parameters.depth as number) ?? 10);
      const mesh = generateHoleMesh(diameter, depth);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'pattern_linear': {
      if (!allFeatures) return null;
      const refId = feature.parameters.featureRef as string;
      const refFeature = allFeatures.find((f) => f.id === refId);
      if (!refFeature || refFeature.suppressed) return null;

      const baseMesh = featureToMesh(refFeature);
      if (!baseMesh) return null;

      const direction = (feature.parameters.direction as string) ?? 'x';
      const count = Math.max(1, Math.round((feature.parameters.count as number) ?? 3));
      const spacing = (feature.parameters.spacing as number) ?? 5;

      // Combine all instance meshes into one
      const allVerts: number[] = [];
      const allNormals: number[] = [];
      const allIndices: number[] = [];
      let vertexOffset = 0;

      for (let i = 0; i < count; i++) {
        const dx = direction === 'x' ? i * spacing : 0;
        const dy = direction === 'y' ? i * spacing : 0;
        const dz = direction === 'z' ? i * spacing : 0;
        const m = translationMatrix(dx, dy, dz);
        const transformed = transformMesh(baseMesh, m);

        for (let v = 0; v < transformed.vertices.length; v++) allVerts.push(transformed.vertices[v]!);
        for (let n = 0; n < transformed.normals.length; n++) allNormals.push(transformed.normals[n]!);
        for (let idx = 0; idx < transformed.indices.length; idx++) {
          allIndices.push((transformed.indices[idx] as number) + vertexOffset / 3);
        }
        vertexOffset += transformed.vertices.length;
      }

      return {
        vertices: new Float32Array(allVerts),
        normals: new Float32Array(allNormals),
        indices: new Uint32Array(allIndices),
        featureId: feature.id,
      };
    }
    case 'pattern_circular': {
      if (!allFeatures) return null;
      const refId = feature.parameters.featureRef as string;
      const refFeature = allFeatures.find((f) => f.id === refId);
      if (!refFeature || refFeature.suppressed) return null;

      const baseMesh = featureToMesh(refFeature);
      if (!baseMesh) return null;

      const axis = ((feature.parameters.axis as string) ?? 'z') as 'x' | 'y' | 'z';
      const count = Math.max(1, Math.round((feature.parameters.count as number) ?? 6));
      const totalAngle = ((feature.parameters.angle as number) ?? 360) * (Math.PI / 180);

      const allVerts: number[] = [];
      const allNormals: number[] = [];
      const allIndices: number[] = [];
      let vertexOffset = 0;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * totalAngle;
        const m = rotationMatrix(axis, angle);
        const transformed = transformMesh(baseMesh, m);

        for (let v = 0; v < transformed.vertices.length; v++) allVerts.push(transformed.vertices[v]!);
        for (let n = 0; n < transformed.normals.length; n++) allNormals.push(transformed.normals[n]!);
        for (let idx = 0; idx < transformed.indices.length; idx++) {
          allIndices.push((transformed.indices[idx] as number) + vertexOffset / 3);
        }
        vertexOffset += transformed.vertices.length;
      }

      return {
        vertices: new Float32Array(allVerts),
        normals: new Float32Array(allNormals),
        indices: new Uint32Array(allIndices),
        featureId: feature.id,
      };
    }
    case 'mirror': {
      if (!allFeatures) return null;
      const refId = feature.parameters.featureRef as string;
      const refFeature = allFeatures.find((f) => f.id === refId);
      if (!refFeature || refFeature.suppressed) return null;

      const baseMesh = featureToMesh(refFeature);
      if (!baseMesh) return null;

      const plane = (feature.parameters.plane as string) ?? 'yz';
      const m = reflectionMatrix(plane);
      const mesh = transformMesh(baseMesh, m);
      mesh.featureId = feature.id;
      return mesh;
    }
    case 'boolean_union': {
      if (!allFeatures) return null;
      const bodyRefs = (feature.parameters.bodyRefs as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const geos: THREE.BufferGeometry[] = [];
      for (const refId of bodyRefs) {
        const ref = allFeatures.find((f) => f.id === refId);
        if (!ref || ref.suppressed) continue;
        const mesh = featureToMesh(ref);
        if (!mesh) continue;
        const geo = meshDataToGeometry(mesh);
        const ox = (ref.parameters.originX as number) ?? 0;
        const oy = (ref.parameters.originY as number) ?? 0;
        const oz = (ref.parameters.originZ as number) ?? 0;
        geo.translate(ox, oy, oz);
        geos.push(geo);
      }
      if (geos.length < 2) return null;
      let result: THREE.BufferGeometry | null = geos[0]!;
      for (let i = 1; i < geos.length; i++) {
        const next = booleanTwo(result!, geos[i]!, 'union');
        if (!next) return null;
        result = next;
      }
      return geometryToMeshData(result!, feature.id);
    }
    case 'boolean_subtract': {
      if (!allFeatures) return null;
      const targetRef = feature.parameters.targetRef as string;
      const toolRef = feature.parameters.toolRef as string;
      if (!targetRef || !toolRef) return null;
      const targetFeature = allFeatures.find((f) => f.id === targetRef);
      const toolFeature = allFeatures.find((f) => f.id === toolRef);
      if (!targetFeature || targetFeature.suppressed) return null;
      if (!toolFeature || toolFeature.suppressed) return null;
      const targetMesh = featureToMesh(targetFeature);
      const toolMesh = featureToMesh(toolFeature);
      if (!targetMesh || !toolMesh) return null;
      const tGeo = meshDataToGeometry(targetMesh);
      const uGeo = meshDataToGeometry(toolMesh);
      const tox = (targetFeature.parameters.originX as number) ?? 0;
      const toy = (targetFeature.parameters.originY as number) ?? 0;
      const toz = (targetFeature.parameters.originZ as number) ?? 0;
      tGeo.translate(tox, toy, toz);
      const uox = (toolFeature.parameters.originX as number) ?? 0;
      const uoy = (toolFeature.parameters.originY as number) ?? 0;
      const uoz = (toolFeature.parameters.originZ as number) ?? 0;
      uGeo.translate(uox, uoy, uoz);
      const result = booleanTwo(tGeo, uGeo, 'subtract');
      if (!result) return null;
      return geometryToMeshData(result!, feature.id);
    }
    case 'boolean_intersect': {
      if (!allFeatures) return null;
      const bodyRefs = (feature.parameters.bodyRefs as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const geos: THREE.BufferGeometry[] = [];
      for (const refId of bodyRefs) {
        const ref = allFeatures.find((f) => f.id === refId);
        if (!ref || ref.suppressed) continue;
        const mesh = featureToMesh(ref);
        if (!mesh) continue;
        const geo = meshDataToGeometry(mesh);
        const ox = (ref.parameters.originX as number) ?? 0;
        const oy = (ref.parameters.originY as number) ?? 0;
        const oz = (ref.parameters.originZ as number) ?? 0;
        geo.translate(ox, oy, oz);
        geos.push(geo);
      }
      if (geos.length < 2) return null;
      let result: THREE.BufferGeometry | null = geos[0]!;
      for (let i = 1; i < geos.length; i++) {
        const next = booleanTwo(result!, geos[i]!, 'intersect');
        if (!next) return null;
        result = next;
      }
      return geometryToMeshData(result!, feature.id);
    }
    case 'shell': {
      if (!allFeatures) return null;
      const targetRef = feature.parameters.targetRef as string;
      if (!targetRef) return null;
      const targetFeature = allFeatures.find((f) => f.id === targetRef);
      if (!targetFeature || targetFeature.suppressed) return null;
      const outerMesh = featureToMesh(targetFeature);
      if (!outerMesh) return null;
      const outerGeo = meshDataToGeometry(outerMesh);
      const thickness = Math.max(0.001, (feature.parameters.thickness as number) ?? 1);
      const tox = (targetFeature.parameters.originX as number) ?? 0;
      const toy = (targetFeature.parameters.originY as number) ?? 0;
      const toz = (targetFeature.parameters.originZ as number) ?? 0;
      outerGeo.translate(tox, toy, toz);
      const innerMesh = featureToMesh(targetFeature);
      if (!innerMesh) return null;
      const innerGeo = meshDataToGeometry(innerMesh);
      outerGeo.computeBoundingBox();
      const box = outerGeo.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);
      const dx = Math.max(0.5, box.max.x - box.min.x - 2 * thickness) / Math.max(0.001, box.max.x - box.min.x);
      const dy = Math.max(0.5, box.max.y - box.min.y - 2 * thickness) / Math.max(0.001, box.max.y - box.min.y);
      const dz = Math.max(0.5, box.max.z - box.min.z - 2 * thickness) / Math.max(0.001, box.max.z - box.min.z);
      innerGeo.translate(tox, toy, toz);
      innerGeo.translate(-center.x, -center.y, -center.z);
      innerGeo.scale(dx, dy, dz);
      innerGeo.translate(center.x, center.y, center.z);
      const result = booleanTwo(outerGeo, innerGeo, 'subtract');
      if (!result) return null;
      return geometryToMeshData(result!, feature.id);
    }
    default:
      return null;
  }
}

/** Convert all (non-suppressed) features to MeshData array */
export function featuresToMeshes(features: FeatureNode[]): MeshData[] {
  // Collect IDs of features that are consumed by composite features
  // (boolean, shell, pattern) so we don't export their geometry twice.
  // Only non-suppressed composites consume their references.
  const consumedIds = new Set<string>();
  for (const f of features) {
    if (f.suppressed) continue;
    if (
      f.type.startsWith('boolean_') ||
      f.type === 'shell' ||
      f.type.startsWith('pattern_') ||
      f.type === 'mirror'
    ) {
      for (const depId of f.dependencies) {
        consumedIds.add(depId);
      }
      // Also consume features referenced in bodyRefs/targetRef/featureRef
      const bodyRefs = (f.parameters.bodyRefs as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      for (const refId of bodyRefs) consumedIds.add(refId);
      if (f.parameters.targetRef) consumedIds.add(f.parameters.targetRef as string);
      if (f.parameters.toolRef) consumedIds.add(f.parameters.toolRef as string);
      if (f.parameters.featureRef) consumedIds.add(f.parameters.featureRef as string);
    }
  }

  return features
    .filter((f) => !f.suppressed && !consumedIds.has(f.id))
    .map((f) => featureToMesh(f, features))
    .filter((m): m is MeshData => m !== null);
}
