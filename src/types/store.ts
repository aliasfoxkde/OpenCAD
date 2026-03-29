import type { FeatureNode, ToolType, DisplayMode, ViewportLayout, SelectionTarget } from './cad';

export interface CADStoreState {
  documentId: string | null;
  documentName: string;
  features: FeatureNode[];
  selectedIds: string[];
  selectionTarget: SelectionTarget | null;
  activeTool: ToolType;
  isSketchMode: boolean;
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
}

export interface ViewStoreState {
  displayMode: DisplayMode;
  viewportLayout: ViewportLayout;
  showGrid: boolean;
  showAxes: boolean;
  showWireframe: boolean;
  showShadows: boolean;
}

export interface ViewStoreActions {
  setDisplayMode: (mode: DisplayMode) => void;
  setViewportLayout: (layout: ViewportLayout) => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  toggleWireframe: () => void;
  toggleShadows: () => void;
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
