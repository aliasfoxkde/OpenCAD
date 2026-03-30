/**
 * CSS 3D View Cube — shows current camera orientation and allows
 * clicking faces to snap to standard views.
 */

import { useState, useCallback } from 'react';
import { useViewStore } from '../../stores/view-store';

type FaceName = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'iso';

interface FaceConfig {
  name: FaceName;
  label: string;
  rx: number;
  ry: number;
  tx: string;
  ty: string;
  tz: string;
  color: string;
}

const FACES: FaceConfig[] = [
  { name: 'front', label: 'F', rx: 0, ry: 0, tx: '0', ty: '0', tz: '52px', color: '#3b82f6' },
  { name: 'back', label: 'B', rx: 0, ry: 180, tx: '0', ty: '0', tz: '-52px', color: '#6366f1' },
  { name: 'top', label: 'T', rx: -90, ry: 0, tx: '0', ty: '52px', tz: '0', color: '#22c55e' },
  { name: 'bottom', label: 'Bo', rx: 90, ry: 0, tx: '0', ty: '-52px', tz: '0', color: '#16a34a' },
  { name: 'right', label: 'R', rx: 0, ry: -90, tx: '52px', ty: '0', tz: '0', color: '#ef4444' },
  { name: 'left', label: 'L', rx: 0, ry: 90, tx: '-52px', ty: '0', tz: '0', color: '#f97316' },
];

const FACE_SIZE = 104;

export function ViewCube() {
  const azimuth = useViewStore((s) => s.cameraAzimuth);
  const elevation = useViewStore((s) => s.cameraElevation);
  const [hoveredFace, setHoveredFace] = useState<FaceName | null>(null);

  const handleClick = useCallback((face: FaceName) => {
    useViewStore.getState().setCameraPreset(face);
  }, []);

  return (
    <div style={containerStyle}>
      <div
        style={{
          ...cubeWrapperStyle,
          transform: `rotateX(${-elevation}deg) rotateY(${azimuth}deg)`,
        }}
      >
        {FACES.map((face) => (
          <div
            key={face.name}
            style={{
              ...faceStyle,
              width: FACE_SIZE,
              height: FACE_SIZE,
              transform: `translate3d(${face.tx}, ${face.ty}, ${face.tz}) rotateY(${face.ry}deg) rotateX(${face.rx}deg)`,
              backgroundColor:
                hoveredFace === face.name ? face.color : `${face.color}22`,
              borderColor: hoveredFace === face.name ? face.color : `${face.color}66`,
            }}
            onClick={() => handleClick(face.name)}
            onMouseEnter={() => setHoveredFace(face.name)}
            onMouseLeave={() => setHoveredFace(null)}
            title={`${face.label} — ${face.name} view`}
          >
            <span style={faceLabelStyle}>{face.label}</span>
          </div>
        ))}
      </div>
      <button
        style={isoBtnStyle}
        onClick={() => handleClick('iso')}
        onMouseEnter={() => setHoveredFace('iso')}
        onMouseLeave={() => setHoveredFace(null)}
        title="Isometric view"
      >
        ISO
      </button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  pointerEvents: 'auto',
};

const cubeWrapperStyle: React.CSSProperties = {
  width: FACE_SIZE,
  height: FACE_SIZE,
  position: 'relative',
  transformStyle: 'preserve-3d',
  transition: 'transform 0.15s ease-out',
};

const faceStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backfaceVisibility: 'hidden',
  border: '1px solid',
  borderRadius: 4,
  cursor: 'pointer',
  transition: 'background-color 0.15s, border-color 0.15s',
  userSelect: 'none',
};

const faceLabelStyle: React.CSSProperties = {
  color: '#e2e8f0',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'system-ui, sans-serif',
  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
  pointerEvents: 'none',
};

const isoBtnStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 3,
  color: '#94a3b8',
  fontSize: 9,
  fontWeight: 600,
  padding: '2px 8px',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  letterSpacing: 0.5,
};
