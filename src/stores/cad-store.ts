import { create } from 'zustand';
import type { CADStoreState, CADStoreActions } from '../types/store';

export const useCADStore = create<CADStoreState & CADStoreActions>((set) => ({
  documentId: null,
  documentName: 'Untitled',
  features: [],
  selectedIds: [],
  selectionTarget: null,
  activeTool: 'select',
  isSketchMode: false,

  setDocument: (id, name) => set({ documentId: id, documentName: name }),
  addFeature: (feature) =>
    set((state) => ({ features: [...state.features, feature] })),
  addFeatureAndSelect: (feature) =>
    set((state) => ({
      features: [...state.features, feature],
      selectedIds: [feature.id],
    })),
  removeFeature: (id) =>
    set((state) => ({
      features: state.features.filter((f) => f.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),
  updateFeature: (id, updates) =>
    set((state) => ({
      features: state.features.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
    })),
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
      const removed = features.splice(oldIndex, 1);
      features.splice(newIndex, 0, removed[0]!);
      return { features };
    }),
  loadFeatures: (features) =>
    set({ features, selectedIds: [], selectionTarget: null }),
}));

// Selector hooks for performance
export const useActiveTool = () => useCADStore((s) => s.activeTool);
export const useFeatures = () => useCADStore((s) => s.features);
export const useSelection = () => useCADStore((s) => s.selectedIds);
export const useIsSketchMode = () => useCADStore((s) => s.isSketchMode);
