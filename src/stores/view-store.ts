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
  fitViewRequested: 0,
  leftPanelWidth: 220,
  rightPanelWidth: 260,

  setDisplayMode: (mode) => set({ displayMode: mode }),
  setViewportLayout: (layout) => set({ viewportLayout: layout }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),
  toggleWireframe: () => set((s) => ({ showWireframe: !s.showWireframe })),
  toggleShadows: () => set((s) => ({ showShadows: !s.showShadows })),
  setCameraPreset: (name) => set({ cameraPreset: name }),
  requestFitView: () => set((s) => ({ fitViewRequested: s.fitViewRequested + 1 })),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
}));
