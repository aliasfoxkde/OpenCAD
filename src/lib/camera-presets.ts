export interface CameraPreset {
  name: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  front: {
    name: 'front',
    label: 'Front',
    position: [0, 0, 20],
    target: [0, 0, 0],
  },
  back: {
    name: 'back',
    label: 'Back',
    position: [0, 0, -20],
    target: [0, 0, 0],
  },
  top: {
    name: 'top',
    label: 'Top',
    position: [0, 20, 0.01],
    target: [0, 0, 0],
  },
  bottom: {
    name: 'bottom',
    label: 'Bottom',
    position: [0, -20, 0.01],
    target: [0, 0, 0],
  },
  right: {
    name: 'right',
    label: 'Right',
    position: [20, 0, 0],
    target: [0, 0, 0],
  },
  left: {
    name: 'left',
    label: 'Left',
    position: [-20, 0, 0],
    target: [0, 0, 0],
  },
  iso: {
    name: 'iso',
    label: 'Isometric',
    position: [10, 8, 10],
    target: [0, 0, 0],
  },
};

export function getPreset(name: string): CameraPreset | undefined {
  return CAMERA_PRESETS[name];
}

export function getPresetNames(): string[] {
  return Object.keys(CAMERA_PRESETS);
}
