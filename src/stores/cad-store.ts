import { create } from 'zustand';
import type { CADStoreState, CADStoreActions } from '../types/store';
import { pushState, undo, redo, canUndo, canRedo } from '../lib/undo-history';
import { getDescendants } from '../lib/assembly-tree';

export const useCADStore = create<CADStoreState & CADStoreActions>((set) => ({
  documentId: null,
  documentName: 'Untitled',
  features: [],
  selectedIds: [],
  selectionTarget: null,
  activeTool: 'select',
  isSketchMode: false,
  dirty: false,
  units: 'mm' as const,

  setDocument: (id, name) => set({ documentId: id, documentName: name }),
  addFeature: (feature) =>
    set((state) => {
      pushState(state.features, state.selectedIds);
      return { features: [...state.features, feature], dirty: true };
    }),
  addFeatureAndSelect: (feature) =>
    set((state) => {
      pushState(state.features, state.selectedIds);
      return {
        features: [...state.features, feature],
        selectedIds: [feature.id],
        dirty: true,
      };
    }),
  removeFeature: (id) =>
    set((state) => {
      pushState(state.features, state.selectedIds);
      // Also remove all descendants of the feature (if it's an assembly)
      const descendantIds = new Set(getDescendants(state.features, id).map((f) => f.id));
      descendantIds.add(id);
      return {
        features: state.features.filter((f) => !descendantIds.has(f.id)),
        selectedIds: state.selectedIds.filter((sid) => !descendantIds.has(sid)),
        dirty: true,
      };
    }),
  updateFeature: (id, updates) =>
    set((state) => {
      pushState(state.features, state.selectedIds);
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
      pushState(state.features, state.selectedIds);
      const clone = structuredClone(source);
      clone.id = crypto.randomUUID();
      clone.name = `${source.name} (copy)`;
      // Clone keeps same parentId (stays in same assembly level)
      if (typeof clone.parameters.originX === 'number') {
        clone.parameters.originX = (clone.parameters.originX as number) + 1;
      }
      return {
        features: [...state.features, clone],
        selectedIds: [clone.id],
        dirty: true,
      };
    }),
  moveFeatureToAssembly: (featureId, parentId) =>
    set((state) => {
      pushState(state.features, state.selectedIds);
      return {
        features: state.features.map((f) =>
          f.id === featureId ? { ...f, parentId: parentId ?? undefined } : f,
        ),
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
      pushState(state.features, state.selectedIds);
      const removed = features.splice(oldIndex, 1);
      features.splice(newIndex, 0, removed[0]!);
      return { features, dirty: true };
    }),
  loadFeatures: (features) => {
    pushState(useCADStore.getState().features, useCADStore.getState().selectedIds);
    set({ features, selectedIds: [], selectionTarget: null, dirty: false });
  },
  undo: () =>
    set((state) => {
      const prev = undo(state.features, state.selectedIds);
      if (!prev) return state;
      // Only restore selection for IDs that still exist in the restored features
      const validIds = prev.selectedIds.filter((id) =>
        prev.features.some((f) => f.id === id),
      );
      return { features: prev.features, selectedIds: validIds, dirty: true };
    }),
  redo: () =>
    set((state) => {
      const next = redo(state.features, state.selectedIds);
      if (!next) return state;
      const validIds = next.selectedIds.filter((id) =>
        next.features.some((f) => f.id === id),
      );
      return { features: next.features, selectedIds: validIds, dirty: true };
    }),
  setUnits: (units) => set({ units }),
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
