import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewStore } from '../../stores/view-store';
import { getPreset } from '../../lib/camera-presets';

const LERP_SPEED = 0.08;

export function CameraController() {
  const cameraPreset = useViewStore((s) => s.cameraPreset);
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const animating = useRef(false);

  // When preset changes, set animation targets
  if (cameraPreset) {
    const preset = getPreset(cameraPreset);
    if (preset) {
      targetPos.current.set(...preset.position);
      targetLookAt.current.set(...preset.target);
      animating.current = true;
    }
  }

  useFrame(({ camera }) => {
    if (!animating.current) return;

    camera.position.lerp(targetPos.current, LERP_SPEED);

    // Also lerp the look-at target
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.add(camera.position);
    currentLookAt.lerp(targetLookAt.current, LERP_SPEED);

    camera.lookAt(targetLookAt.current);

    // Stop animating when close enough
    if (camera.position.distanceTo(targetPos.current) < 0.01) {
      camera.position.copy(targetPos.current);
      camera.lookAt(targetLookAt.current);
      animating.current = false;
      useViewStore.getState().cameraPreset = null;
    }
  });

  return null;
}
