import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Scene } from './Scene';
import { CameraController } from './CameraController';
import { useViewStore } from '../../stores/view-store';

export function Viewport() {
  const showGrid = useViewStore((s) => s.showGrid);
  const showShadows = useViewStore((s) => s.showShadows);

  return (
    <Canvas
      camera={{ position: [10, 8, 10], fov: 50, near: 0.01, far: 10000 }}
      shadows={showShadows}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0f172a');
      }}
    >
      <CameraController />
      <Scene />
      <OrbitControls makeDefault />
      {showGrid && (
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={10}
          fadeDistance={50}
          cellColor="#1e293b"
          sectionColor="#334155"
        />
      )}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </Canvas>
  );
}
