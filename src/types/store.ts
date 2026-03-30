import type { FeatureNode, ToolType, DisplayMode, ViewportLayout, SelectionTarget } from './cad';
import type { DimensionAnnotation } from '../lib/annotations';

export type Unit = 'mm' | 'cm' | 'm' | 'in' | 'ft';

export const UNIT_CONVERSION: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

export interface CADStoreState {
  documentId: string | null;
  documentName: string;
  features: FeatureNode[];
  selectedIds: string[];
  selectionTarget: SelectionTarget | null;
  activeTool: ToolType;
  isSketchMode: boolean;
  dirty: boolean;
  units: Unit;
}

export interface CADStoreActions {
  setDocument: (id: string, name: string) => void;
  addFeature: (feature: FeatureNode) => void;
  addFeatureAndSelect: (feature: FeatureNode) => void;
  removeFeature: (id: string) => void;
  updateFeature: (id: string, updates: Partial<FeatureNode>) => void;
  select: (ids: string[], target?: SelectionTarget) => void;
  clearSelection: () => void;
  setActiveTool: (tool: ToolType) => void;
  setSketchMode: (active: boolean) => void;
  reorderFeature: (id: string, newIndex: number) => void;
  loadFeatures: (features: FeatureNode[]) => void;
  duplicateFeature: (id: string) => void;
  moveFeatureToAssembly: (featureId: string, parentId: string | null) => void;
  undo: () => void;
  redo: () => void;
  setUnits: (units: Unit) => void;
}

export interface ViewStoreState {
  displayMode: DisplayMode;
  viewportLayout: ViewportLayout;
  showGrid: boolean;
  showAxes: boolean;
  showWireframe: boolean;
  showShadows: boolean;
  cameraPreset: string | null;
  fitViewRequested: number;
  zoomToSelectionRequested: number;
  leftPanelWidth: number;
  rightPanelWidth: number;
  sectionPlane: {
    enabled: boolean;
    position: [number, number, number];
    normal: 'x' | 'y' | 'z';
    offset: number;
  };
  measurePoints: Array<[number, number, number]>;
  snapToGrid: boolean;
  gridSnapSize: number;
  annotations: DimensionAnnotation[];
}

export interface ViewStoreActions {
  setDisplayMode: (mode: DisplayMode) => void;
  setViewportLayout: (layout: ViewportLayout) => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  toggleWireframe: () => void;
  toggleShadows: () => void;
  setCameraPreset: (name: string) => void;
  requestFitView: () => void;
  requestZoomToSelection: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleSectionPlane: () => void;
  setSectionPlaneNormal: (normal: 'x' | 'y' | 'z') => void;
  setSectionPlaneOffset: (offset: number) => void;
  addMeasurePoint: (point: [number, number, number]) => void;
  clearMeasurePoints: () => void;
  toggleSnap: () => void;
  setGridSnapSize: (size: number) => void;
  addAnnotation: (annotation: DimensionAnnotation) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
}

export interface UIStoreState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  theme: 'dark' | 'light';
}

export interface UIStoreActions {
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  toggleCommandPalette: () => void;
  toggleSettings: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}
