import { create } from 'zustand';
import type { CADStoreState, CADStoreActions } from '../types/store';
import { pushState, undo, redo, canUndo, canRedo } from '../lib/undo-history';

export const useCADStore = create<CADStoreState & CADStoreActions>((set) => ({
  documentId: null,
  documentName: 'Untitled',
  features: [],
  selectedIds: [],
  selectionTarget: null,
  activeTool: 'select',
  isSketchMode: false,
  dirty: false,

  setDocument: (id, name) => set({ documentId: id, documentName: name }),
  addFeature: (feature) =>
    set((state) => {
      pushState(state.features);
      return { features: [...state.features, feature], dirty: true };
    }),
  addFeatureAndSelect: (feature) =>
    set((state) => {
      pushState(state.features);
      return {
        features: [...state.features, feature],
        selectedIds: [feature.id],
        dirty: true,
      };
    }),
  removeFeature: (id) =>
    set((state) => {
      pushState(state.features);
      return {
        features: state.features.filter((f) => f.id !== id),
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
        dirty: true,
      };
    }),
  updateFeature: (id, updates) =>
    set((state) => {
      pushState(state.features);
      return {
        features: state.features.map((f) =>
          f.id === id ? { ...f, ...updates } : f,
        ),
        dirty: true,
      };
    }),
  duplicateFeature: (id) =>
    set((state) => {
      const source = state.features.find((f) => f.id === id);
      if (!source) return state;
      pushState(state.features);
      const clone = structuredClone(source);
      clone.id = crypto.randomUUID();
      clone.name = `${source.name} (copy)`;
      if (typeof clone.parameters.originX === 'number') {
        clone.parameters.originX = (clone.parameters.originX as number) + 1;
      }
      return {
        features: [...state.features, clone],
        selectedIds: [clone.id],
        dirty: true,
      };
    }),
  select: (ids, target) =>
    set({ selectedIds: ids, selectionTarget: target ?? null }),
  clearSelection: () => set({ selectedIds: [], selectionTarget: null }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSketchMode: (active) => set({ isSketchMode: active }),
  reorderFeature: (id, newIndex) =>
    set((state) => {
      const features = [...state.features];
      const oldIndex = features.findIndex((f) => f.id === id);
      if (oldIndex === -1) return state;
      pushState(state.features);
      const removed = features.splice(oldIndex, 1);
      features.splice(newIndex, 0, removed[0]!);
      return { features, dirty: true };
    }),
  loadFeatures: (features) => {
    pushState(useCADStore.getState().features);
    set({ features, selectedIds: [], selectionTarget: null, dirty: false });
  },
  undo: () =>
    set((state) => {
      const prev = undo(state.features);
      if (!prev) return state;
      return { features: prev, selectedIds: [], dirty: true };
    }),
  redo: () =>
    set((state) => {
      const next = redo(state.features);
      if (!next) return state;
      return { features: next, selectedIds: [], dirty: true };
    }),
}));

// Selector hooks for performance
export const useActiveTool = () => useCADStore((s) => s.activeTool);
export const useFeatures = () => useCADStore((s) => s.features);
export const useSelection = () => useCADStore((s) => s.selectedIds);
export const useIsSketchMode = () => useCADStore((s) => s.isSketchMode);
export const useCanUndoRedo = () =>
  useCADStore((state) => ({
    // Depend on features length so component re-renders after undo/redo
    _trigger: state.features.length,
    canUndo: canUndo(),
    canRedo: canRedo(),
  }));
