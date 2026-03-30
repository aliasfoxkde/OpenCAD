import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewStore } from '../../stores/view-store';
import { useCADStore } from '../../stores/cad-store';
import { getPreset } from '../../lib/camera-presets';

const LERP_SPEED = 0.08;
const ZOOM_FACTOR = 1.3;

// Module-level animation state (shared between React and imperative calls)
const animTarget = {
  pos: new THREE.Vector3(),
  lookAt: new THREE.Vector3(),
  active: false,
};
const lastCameraState = {
  pos: new THREE.Vector3(10, 8, 10),
  lookAt: new THREE.Vector3(0, 0, 0),
};

export function CameraController() {
  const cameraPreset = useViewStore((s) => s.cameraPreset);
  const fitViewRequested = useViewStore((s) => s.fitViewRequested);
  const zoomToSelectionRequested = useViewStore((s) => s.zoomToSelectionRequested);

  // When preset changes, set animation targets
  if (cameraPreset) {
    const preset = getPreset(cameraPreset);
    if (preset) {
      animTarget.pos.set(...preset.position);
      animTarget.lookAt.set(...preset.target);
      animTarget.active = true;
    }
  }

  useFrame(({ camera, scene }) => {
    // Track camera state for imperative calls (zoom)
    lastCameraState.pos.copy(camera.position);

    // Handle fitView request
    if (fitViewRequested > 0) {
      fitViewToScene(camera, scene);
      useViewStore.setState({ fitViewRequested: 0 });
    }

    // Handle zoom-to-selection request
    if (zoomToSelectionRequested > 0) {
      zoomToSelected(camera, scene);
      useViewStore.setState({ zoomToSelectionRequested: 0 });
    }

    if (!animTarget.active) return;

    camera.position.lerp(animTarget.pos, LERP_SPEED);
    camera.lookAt(animTarget.lookAt);

    // Stop animating when close enough
    if (camera.position.distanceTo(animTarget.pos) < 0.01) {
      camera.position.copy(animTarget.pos);
      camera.lookAt(animTarget.lookAt);
      animTarget.active = false;
      useViewStore.setState({ cameraPreset: null });
      lastCameraState.pos.copy(camera.position);
      lastCameraState.lookAt.copy(animTarget.lookAt);
    }
  });

  return null;
}

/** Zoom camera in/out along its current view direction (imperative, callable from keyboard handler) */
export function zoomCamera(direction: 'in' | 'out') {
  const camera = lastCameraState.pos.clone();
  const lookAt = lastCameraState.lookAt.clone();

  const viewDir = new THREE.Vector3().subVectors(lookAt, camera).normalize();
  const distance = camera.distanceTo(lookAt);

  const newDistance = direction === 'in'
    ? Math.max(0.1, distance / ZOOM_FACTOR)
    : Math.min(1000, distance * ZOOM_FACTOR);

  const newPos = new THREE.Vector3()
    .subVectors(lookAt, viewDir.multiplyScalar(newDistance));

  animTarget.pos.copy(newPos);
  animTarget.lookAt.copy(lookAt);
  animTarget.active = true;
}

/** Compute bounding box of all scene objects and frame the camera */
function fitViewToScene(_camera: THREE.Camera, scene: THREE.Scene) {
  const box = new THREE.Box3();
  let hasGeometry = false;

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      obj.geometry.computeBoundingBox();
      if (obj.geometry.boundingBox) {
        const meshBox = obj.geometry.boundingBox.clone();
        meshBox.applyMatrix4(obj.matrixWorld);
        box.union(meshBox);
        hasGeometry = true;
      }
    }
  });

  if (!hasGeometry) {
    animTarget.pos.set(10, 8, 10);
    animTarget.lookAt.set(0, 0, 0);
    animTarget.active = true;
    return;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = Math.max(maxDim * 2, 2);

  const dir = new THREE.Vector3(1, 0.8, 1).normalize();
  animTarget.pos.copy(center).add(dir.multiplyScalar(distance));
  animTarget.lookAt.copy(center);
  animTarget.active = true;
}

/** Zoom camera to frame only the selected meshes */
function zoomToSelected(camera: THREE.Camera, scene: THREE.Scene) {
  const selectedIds = useCADStore.getState().selectedIds;
  const box = new THREE.Box3();
  let hasGeometry = false;

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
    // Check if this mesh's userData matches a selected feature ID
    const meshId = obj.userData?.featureId;
    if (!meshId || !selectedIds.includes(meshId)) return;

    obj.geometry.computeBoundingBox();
    if (obj.geometry.boundingBox) {
      const meshBox = obj.geometry.boundingBox.clone();
      meshBox.applyMatrix4(obj.matrixWorld);
      box.union(meshBox);
      hasGeometry = true;
    }
  });

  if (!hasGeometry) {
    // Fall back to fit all
    fitViewToScene(camera, scene);
    return;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = Math.max(maxDim * 2, 2);

  const dir = new THREE.Vector3(1, 0.8, 1).normalize();
  animTarget.pos.copy(center).add(dir.multiplyScalar(distance));
  animTarget.lookAt.copy(center);
  animTarget.active = true;
}
