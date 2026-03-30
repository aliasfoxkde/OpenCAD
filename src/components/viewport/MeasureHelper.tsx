/**
 * R3F component that enables point-picking measurement.
 * When the measure tool is active, clicking on geometry picks points.
 * Two consecutive points show distance in the MeasurementOverlay.
 */

import { useRef, useEffect } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';

const CLICK_THRESHOLD = 5;

export function MeasureHelper() {
  const activeTool = useCADStore((s) => s.activeTool);
  const addMeasurePoint = useViewStore((s) => s.addMeasurePoint);
  const clearMeasurePoints = useViewStore((s) => s.clearMeasurePoints);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  // Clear points when switching away from measure tool
  useEffect(() => {
    if (activeTool !== 'measure') {
      clearMeasurePoints();
    }
  }, [activeTool, clearMeasurePoints]);

  if (activeTool !== 'measure') return null;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!pointerDownPos.current) return;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    pointerDownPos.current = null;
    if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) return;

    // Get the intersection point in world space
    const point = e.point;
    addMeasurePoint([point.x, point.y, point.z]);
  };

  return (
    <>
      {/* Invisible plane for picking when not clicking on geometry */}
      <mesh
        visible={false}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

/** Renders measurement line + distance label between picked points */
export function MeasureLine() {
  const measurePoints = useViewStore((s) => s.measurePoints);
  const activeTool = useCADStore((s) => s.activeTool);

  if (activeTool !== 'measure' || measurePoints.length < 2) return null;

  const a = measurePoints[0]!;
  const b = measurePoints[1]!;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

  return (
    <group>
      {/* Line between points */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([...a, ...b]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#22d3ee" linewidth={2} />
      </line>
      {/* Point markers */}
      <mesh position={a}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      <mesh position={b}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      {/* Distance label via sprite */}
      <DistanceLabel position={mid} distance={dist} />
    </group>
  );
}

function DistanceLabel({ position, distance }: { position: [number, number, number]; distance: number }) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.roundRect(0, 0, 256, 64, 8);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.roundRect(0, 0, 256, 64, 8);
  ctx.stroke();
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${distance.toFixed(2)} mm`, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });

  return <sprite position={position} scale={[2, 0.5, 1]} material={material} />;
}
