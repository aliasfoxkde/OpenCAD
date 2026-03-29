import { create } from 'zustand';
import type { ViewStoreState, ViewStoreActions } from '../types/store';

export const useViewStore = create<ViewStoreState & ViewStoreActions>((set) => ({
  displayMode: 'shaded_edges',
  viewportLayout: 'single',
  showGrid: true,
  showAxes: true,
  showWireframe: false,
  showShadows: false,
  cameraPreset: null,

  setDisplayMode: (mode) => set({ displayMode: mode }),
  setViewportLayout: (layout) => set({ viewportLayout: layout }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),
  toggleWireframe: () => set((s) => ({ showWireframe: !s.showWireframe })),
  toggleShadows: () => set((s) => ({ showShadows: !s.showShadows })),
  setCameraPreset: (name) => set({ cameraPreset: name }),
}));
