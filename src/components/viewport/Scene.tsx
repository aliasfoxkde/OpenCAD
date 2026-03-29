import { useMemo } from 'react';
import * as THREE from 'three';
import { CADModel } from './CADModel';
import { Line } from '@react-three/drei';

export function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.8}
        castShadow
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.2} />

      {/* Origin axis lines */}
      <AxisLine end={[5, 0, 0]} color="#ef4444" />
      <AxisLine end={[0, 5, 0]} color="#22c55e" />
      <AxisLine end={[0, 0, 5]} color="#3b82f6" />

      {/* CAD model rendering */}
      <CADModel />
    </>
  );
}

function AxisLine({
  end,
  color,
}: {
  end: [number, number, number];
  color: string;
}) {
  const points = useMemo(
    () => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...end)],
    [end],
  );

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
    />
  );
}
