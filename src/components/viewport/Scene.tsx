import { useMemo } from 'react';
import * as THREE from 'three';
import { CADModel } from './CADModel';
import { Line } from '@react-three/drei';
import { useViewStore } from '../../stores/view-store';

export function Scene() {
  const showAxes = useViewStore((s) => s.showAxes);
  const showShadows = useViewStore((s) => s.showShadows);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.8}
        castShadow={showShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.2} />

      {/* Origin axis lines */}
      {showAxes && (
        <>
          <AxisLine end={[5, 0, 0]} color="#ef4444" />
          <AxisLine end={[0, 5, 0]} color="#22c55e" />
          <AxisLine end={[0, 0, 5]} color="#3b82f6" />
        </>
      )}

      {/* CAD model rendering */}
      <CADModel />

      {/* Shadow-receiving ground plane */}
      {showShadows && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial opacity={0.15} />
        </mesh>
      )}
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
