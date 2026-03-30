/**
 * Section Plane — applies Three.js clipping planes to reveal cross-sections.
 *
 * When enabled, a clipping plane cuts through all geometry in the scene.
 * The plane normal and offset are controlled via the view store.
 * A translucent quad visualizes the cutting plane position.
 */

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useViewStore } from '../../stores/view-store';

const PLANE_SIZE = 20;

export function SectionPlane() {
  const enabled = useViewStore((s) => s.sectionPlane.enabled);
  const normal = useViewStore((s) => s.sectionPlane.normal);
  const offset = useViewStore((s) => s.sectionPlane.offset);
  const { gl, scene } = useThree();

  const clippingPlane = useMemo(() => new THREE.Plane(), []);

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  useEffect(() => {
    if (!enabled) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of materials) {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
              mat.clippingPlanes = [];
              mat.needsUpdate = true;
            }
          }
        }
      });
      return;
    }

    const normalVec = new THREE.Vector3(
      normal === 'x' ? 1 : 0,
      normal === 'y' ? 1 : 0,
      normal === 'z' ? 1 : 0,
    );
    clippingPlane.setFromNormalAndCoplanarPoint(
      normalVec,
      new THREE.Vector3(
        normal === 'x' ? offset : 0,
        normal === 'y' ? offset : 0,
        normal === 'z' ? offset : 0,
      ),
    );

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
            mat.clippingPlanes = [clippingPlane];
            mat.clipShadows = true;
            mat.needsUpdate = true;
          }
        }
      }
    });
  }, [enabled, normal, offset, clippingPlane, gl, scene]);

  if (!enabled) return null;

  return <SectionPlaneVisual normal={normal} offset={offset} />;
}

function SectionPlaneVisual({
  normal,
  offset,
}: {
  normal: 'x' | 'y' | 'z';
  offset: number;
}) {
  const { rotation, position } = useMemo(() => {
    const rot = new THREE.Euler();
    const pos = new THREE.Vector3();

    switch (normal) {
      case 'x':
        rot.set(0, Math.PI / 2, 0);
        pos.set(offset, 0, 0);
        break;
      case 'y':
        rot.set(-Math.PI / 2, 0, 0);
        pos.set(0, offset, 0);
        break;
      case 'z':
        rot.set(0, 0, 0);
        pos.set(0, 0, offset);
        break;
    }

    return {
      rotation: [rot.x, rot.y, rot.z] as [number, number, number],
      position: [pos.x, pos.y, pos.z] as [number, number, number],
    };
  }, [normal, offset]);

  return (
    <group position={position} rotation={rotation}>
      <mesh renderOrder={999}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE)]} />
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}
