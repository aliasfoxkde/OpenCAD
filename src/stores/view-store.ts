import { create } from 'zustand';
import type { ViewStoreState, ViewStoreActions } from '../types/store';
import type { DimensionAnnotation } from '../lib/annotations';

export const useViewStore = create<ViewStoreState & ViewStoreActions>((set) => ({
  displayMode: 'shaded_edges',
  viewportLayout: 'single',
  showGrid: true,
  showAxes: true,
  showWireframe: false,
  showShadows: false,
  cameraPreset: null,
  fitViewRequested: 0,
  zoomToSelectionRequested: 0,
  leftPanelWidth: 220,
  rightPanelWidth: 260,
  sectionPlane: {
    enabled: false,
    position: [0, 0, 0] as [number, number, number],
    normal: 'y',
    offset: 0,
  },
  measurePoints: [],
  snapToGrid: false,
  gridSnapSize: 0.5,
  annotations: [],

  setDisplayMode: (mode) => set({ displayMode: mode }),
  setViewportLayout: (layout) => set({ viewportLayout: layout }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),
  toggleWireframe: () => set((s) => ({ showWireframe: !s.showWireframe })),
  toggleShadows: () => set((s) => ({ showShadows: !s.showShadows })),
  setCameraPreset: (name) => set({ cameraPreset: name }),
  requestFitView: () => set((s) => ({ fitViewRequested: s.fitViewRequested + 1 })),
  requestZoomToSelection: () => set((s) => ({ zoomToSelectionRequested: s.zoomToSelectionRequested + 1 })),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
  toggleSectionPlane: () => set((s) => ({
    sectionPlane: { ...s.sectionPlane, enabled: !s.sectionPlane.enabled },
  })),
  setSectionPlaneNormal: (normal) => set((s) => ({
    sectionPlane: { ...s.sectionPlane, normal },
  })),
  setSectionPlaneOffset: (offset) => set((s) => ({
    sectionPlane: { ...s.sectionPlane, offset },
  })),
  addMeasurePoint: (point) => set((s) => ({
    measurePoints: [...s.measurePoints.slice(-1), point],
  })),
  clearMeasurePoints: () => set({ measurePoints: [] }),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  setGridSnapSize: (size) => set({ gridSnapSize: size }),
  addAnnotation: (annotation: DimensionAnnotation) => set((s) => ({
    annotations: [...s.annotations, annotation],
  })),
  removeAnnotation: (id: string) => set((s) => ({
    annotations: s.annotations.filter((a) => a.id !== id),
  })),
  clearAnnotations: () => set({ annotations: [] }),
}));
