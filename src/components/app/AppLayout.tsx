import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Toolbar } from '../ui/Toolbar';
import { FeatureTree } from '../ui/FeatureTree';
import { PropertiesPanel } from '../ui/PropertiesPanel';
import { StatusBar } from '../ui/StatusBar';
import { SketchToolbar } from '../sketcher/SketchToolbar';
import { CommandPalette } from '../ui/CommandPalette';
import { DocumentDashboard } from '../ui/DocumentDashboard';
import { ToastContainer } from '../ui/Toast';
import { ConfirmDialogContainer } from '../ui/ConfirmDialog';
import { ErrorBoundary } from '../ErrorBoundary';
import { ContextMenu } from '../ui/ContextMenu';
import type { ContextMenuItem } from '../ui/ContextMenu';

const Viewport = lazy(() => import('../viewport/Viewport').then((m) => ({ default: m.Viewport })));
const SketchCanvas = lazy(() => import('../sketcher/SketchCanvas').then((m) => ({ default: m.SketchCanvas })));
import { MeasurementOverlay } from '../ui/MeasurementOverlay';
import { ViewCube } from '../viewport/ViewCube';
import { CollabPanel } from '../ui/CollabPanel';
import { useUIStore } from '../../stores/ui-store';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useSketchStore } from '../../stores/sketch-store';
import { handleKeyEvent, registerStandardCommands } from '../../hooks/useKeyboardShortcuts';
import { getDefaultParameters } from '../../cad/features';
import { nanoid } from 'nanoid';
import {
  handleNewDocument,
  handleOpenDocument,
  handleSaveDocument,
  handleExport,
  handleImportFile,
  handleScreenshot,
} from '../../lib/file-actions';
import { copyFeatures, pasteFeatures, cutFeatures, hasClipboardContent } from '../../lib/clipboard';
import { zoomCamera } from '../viewport/CameraController';
import type { ToolType, FeatureType } from '../../types/cad';

const primitiveTypeMap: Partial<Record<ToolType, FeatureType>> = {
  box: 'extrude',
  cylinder: 'revolve',
  sphere: 'sphere',
  cone: 'cone',
  torus: 'torus',
};

type MenuItemDef =
  | { type: 'item'; label: string; shortcut?: string; action: () => void; disabled?: boolean }
  | { type: 'separator' };

type MenuDef = { label: string; items: MenuItemDef[] };

export function AppLayout() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const sketchActive = useSketchStore((s) => s.active);
  const documentId = useCADStore((s) => s.documentId);
  const leftPanelWidth = useViewStore((s) => s.leftPanelWidth);
  const rightPanelWidth = useViewStore((s) => s.rightPanelWidth);
  const setLeftPanelWidth = useViewStore((s) => s.setLeftPanelWidth);
  const setRightPanelWidth = useViewStore((s) => s.setRightPanelWidth);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const clearSelection = useCADStore((s) => s.clearSelection);
  const removeFeature = useCADStore((s) => s.removeFeature);
  const setSketchMode = useCADStore((s) => s.setSketchMode);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: (ContextMenuItem | 'divider')[];
  } | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openViewportContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = useCADStore.getState();
    const hasSelection = state.selectedIds.length > 0;
    const items: (ContextMenuItem | 'divider')[] = [];

    if (hasSelection) {
      items.push(
        {
          id: 'cut',
          label: 'Cut',
          shortcut: 'Ctrl+X',
          action: () => {
            const selected = state.features.filter((f) => state.selectedIds.includes(f.id));
            if (selected.length > 0) {
              cutFeatures(selected);
              for (const f of selected) state.removeFeature(f.id);
              state.clearSelection();
            }
          },
        },
        {
          id: 'copy',
          label: 'Copy',
          shortcut: 'Ctrl+C',
          action: () => {
            const selected = state.features.filter((f) => state.selectedIds.includes(f.id));
            if (selected.length > 0) copyFeatures(selected);
          },
        },
      );
    }

    if (hasClipboardContent()) {
      items.push({
        id: 'paste',
        label: 'Paste',
        shortcut: 'Ctrl+V',
        action: () => {
          const pasted = pasteFeatures();
          for (const f of pasted) state.addFeatureAndSelect(f);
        },
      });
    }

    if (hasSelection) {
      items.push(
        {
          id: 'duplicate',
          label: 'Duplicate',
          shortcut: 'Ctrl+D',
          action: () => {
            for (const id of state.selectedIds) state.duplicateFeature(id);
          },
        },
        'divider',
        {
          id: 'pattern',
          label: 'Pattern',
          submenu: [
            {
              id: 'pattern_linear',
              label: 'Linear Pattern',
              action: () => {
                const defaults = getDefaultParameters('pattern_linear');
                const id = nanoid();
                const selectedId = state.selectedIds[0];
                if (selectedId) defaults.featureRef = selectedId;
                const deps = selectedId ? [selectedId] : [];
                state.addFeatureAndSelect({
                  id,
                  type: 'pattern_linear',
                  name: `Linear Pattern ${state.features.length + 1}`,
                  parameters: defaults,
                  dependencies: deps,
                  children: [],
                  suppressed: false,
                });
              },
            },
            {
              id: 'pattern_circular',
              label: 'Circular Pattern',
              action: () => {
                const defaults = getDefaultParameters('pattern_circular');
                const id = nanoid();
                const selectedId = state.selectedIds[0];
                if (selectedId) defaults.featureRef = selectedId;
                const deps = selectedId ? [selectedId] : [];
                state.addFeatureAndSelect({
                  id,
                  type: 'pattern_circular',
                  name: `Circular Pattern ${state.features.length + 1}`,
                  parameters: defaults,
                  dependencies: deps,
                  children: [],
                  suppressed: false,
                });
              },
            },
            {
              id: 'mirror',
              label: 'Mirror',
              submenu: [
                {
                  id: 'mirror_yz',
                  label: 'Mirror across YZ',
                  action: () => {
                    const defaults = getDefaultParameters('mirror');
                    defaults.plane = 'yz';
                    const id = nanoid();
                    const selectedId = state.selectedIds[0];
                    if (selectedId) defaults.featureRef = selectedId;
                    const deps = selectedId ? [selectedId] : [];
                    state.addFeatureAndSelect({
                      id,
                      type: 'mirror',
                      name: `Mirror YZ ${state.features.length + 1}`,
                      parameters: defaults,
                      dependencies: deps,
                      children: [],
                      suppressed: false,
                    });
                  },
                },
                {
                  id: 'mirror_xz',
                  label: 'Mirror across XZ',
                  action: () => {
                    const defaults = getDefaultParameters('mirror');
                    defaults.plane = 'xz';
                    const id = nanoid();
                    const selectedId = state.selectedIds[0];
                    if (selectedId) defaults.featureRef = selectedId;
                    const deps = selectedId ? [selectedId] : [];
                    state.addFeatureAndSelect({
                      id,
                      type: 'mirror',
                      name: `Mirror XZ ${state.features.length + 1}`,
                      parameters: defaults,
                      dependencies: deps,
                      children: [],
                      suppressed: false,
                    });
                  },
                },
                {
                  id: 'mirror_xy',
                  label: 'Mirror across XY',
                  action: () => {
                    const defaults = getDefaultParameters('mirror');
                    defaults.plane = 'xy';
                    const id = nanoid();
                    const selectedId = state.selectedIds[0];
                    if (selectedId) defaults.featureRef = selectedId;
                    const deps = selectedId ? [selectedId] : [];
                    state.addFeatureAndSelect({
                      id,
                      type: 'mirror',
                      name: `Mirror XY ${state.features.length + 1}`,
                      parameters: defaults,
                      dependencies: deps,
                      children: [],
                      suppressed: false,
                    });
                  },
                },
              ],
            },
          ],
        },
        'divider',
        {
          id: 'boolean',
          label: 'Boolean',
          submenu: [
            {
              id: 'bool_union',
              label: 'Union',
              action: () => {
                const defaults = getDefaultParameters('boolean_union');
                const id = nanoid();
                const selIds = state.selectedIds;
                if (selIds.length >= 2) defaults.bodyRefs = selIds.join(',');
                const deps = selIds.length > 0 ? [...selIds] : [];
                state.addFeatureAndSelect({
                  id,
                  type: 'boolean_union',
                  name: `Union ${state.features.length + 1}`,
                  parameters: defaults,
                  dependencies: deps,
                  children: [],
                  suppressed: false,
                });
              },
            },
            {
              id: 'bool_subtract',
              label: 'Subtract',
              action: () => {
                const defaults = getDefaultParameters('boolean_subtract');
                const id = nanoid();
                const selIds = state.selectedIds;
                if (selIds.length >= 2) {
                  defaults.targetRef = selIds[0];
                  defaults.toolRef = selIds[1];
                } else if (selIds.length === 1) {
                  defaults.targetRef = selIds[0];
                }
                const deps = selIds.length > 0 ? [...selIds] : [];
                state.addFeatureAndSelect({
                  id,
                  type: 'boolean_subtract',
                  name: `Subtract ${state.features.length + 1}`,
                  parameters: defaults,
                  dependencies: deps,
                  children: [],
                  suppressed: false,
                });
              },
            },
            {
              id: 'bool_intersect',
              label: 'Intersect',
              action: () => {
                const defaults = getDefaultParameters('boolean_intersect');
                const id = nanoid();
                const selIds = state.selectedIds;
                if (selIds.length >= 2) defaults.bodyRefs = selIds.join(',');
                const deps = selIds.length > 0 ? [...selIds] : [];
                state.addFeatureAndSelect({
                  id,
                  type: 'boolean_intersect',
                  name: `Intersect ${state.features.length + 1}`,
                  parameters: defaults,
                  dependencies: deps,
                  children: [],
                  suppressed: false,
                });
              },
            },
            {
              id: 'shell',
              label: 'Shell',
              action: () => {
                const defaults = getDefaultParameters('shell');
                const id = nanoid();
                const selectedId = state.selectedIds[0];
                if (selectedId) defaults.targetRef = selectedId;
                const deps = selectedId ? [selectedId] : [];
                state.addFeatureAndSelect({
                  id,
                  type: 'shell',
                  name: `Shell ${state.features.length + 1}`,
                  parameters: defaults,
                  dependencies: deps,
                  children: [],
                  suppressed: false,
                });
              },
            },
          ],
        },
        'divider',
        {
          id: 'suppress',
          label: 'Suppress/Unsuppress',
          action: () => {
            for (const id of state.selectedIds) {
              const feat = state.features.find((f) => f.id === id);
              if (feat) state.updateFeature(id, { suppressed: !feat.suppressed });
            }
          },
        },
        'divider',
        {
          id: 'delete',
          label: 'Delete',
          shortcut: 'Del',
          danger: true,
          action: () => {
            for (const id of state.selectedIds) state.removeFeature(id);
            state.clearSelection();
          },
        },
      );
    }

    if (items.length > 0) items.push('divider');

    items.push(
      {
        id: 'select_all',
        label: 'Select All',
        shortcut: 'Ctrl+A',
        action: () => {
          const feats = useCADStore.getState().features;
          useCADStore.getState().select(feats.map((f) => f.id));
        },
      },
      { id: 'fit_view', label: 'Fit View', shortcut: 'F', action: () => useViewStore.getState().requestFitView() },
      {
        id: 'zoom_selection',
        label: 'Zoom to Selection',
        shortcut: 'Shift+F',
        action: () => useViewStore.getState().requestZoomToSelection(),
      },
      'divider',
      { id: 'toggle_grid', label: 'Toggle Grid', shortcut: 'G', action: () => useViewStore.getState().toggleGrid() },
      {
        id: 'toggle_wireframe',
        label: 'Toggle Wireframe',
        shortcut: 'W',
        action: () => useViewStore.getState().toggleWireframe(),
      },
      { id: 'toggle_shadows', label: 'Toggle Shadows', action: () => useViewStore.getState().toggleShadows() },
      {
        id: 'toggle_section',
        label: 'Toggle Section Plane',
        action: () => useViewStore.getState().toggleSectionPlane(),
      },
    );

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const handleDuplicate = useCallback(() => {
    const state = useCADStore.getState();
    for (const id of state.selectedIds) {
      useCADStore.getState().duplicateFeature(id);
    }
  }, []);

  const handleSelectAll = useCallback(() => {
    const features = useCADStore.getState().features;
    useCADStore.getState().select(features.map((f) => f.id));
  }, []);

  const handleInsertPrimitive = useCallback((toolType: ToolType) => {
    const featureType = primitiveTypeMap[toolType];
    if (!featureType) return;
    const state = useCADStore.getState();
    const defaults = getDefaultParameters(featureType);
    const id = nanoid();
    const name = `${toolType.charAt(0).toUpperCase() + toolType.slice(1)} ${state.features.length + 1}`;
    state.addFeatureAndSelect({
      id,
      type: featureType,
      name,
      parameters: defaults,
      dependencies: [],
      children: [],
      suppressed: false,
    });
    state.setActiveTool('select');
  }, []);

  const handleInsertPattern = useCallback((patternType: 'pattern_linear' | 'pattern_circular' | 'mirror') => {
    const state = useCADStore.getState();
    const defaults = getDefaultParameters(patternType);
    const id = nanoid();
    const labels: Record<string, string> = {
      pattern_linear: 'Linear Pattern',
      pattern_circular: 'Circular Pattern',
      mirror: 'Mirror',
    };
    const label = labels[patternType] ?? patternType;
    const name = `${label} ${state.features.length + 1}`;

    // Reference the first selected feature, if any
    const selectedId = state.selectedIds[0];
    if (selectedId) {
      defaults.featureRef = selectedId;
    }

    const dependencies = selectedId ? [selectedId] : [];
    state.addFeatureAndSelect({
      id,
      type: patternType,
      name,
      parameters: defaults,
      dependencies,
      children: [],
      suppressed: false,
    });
    state.setActiveTool('select');
  }, []);

  const handleInsertBoolean = useCallback((boolType: 'boolean_union' | 'boolean_subtract' | 'boolean_intersect') => {
    const state = useCADStore.getState();
    const defaults = getDefaultParameters(boolType);
    const id = nanoid();
    const labels: Record<string, string> = {
      boolean_union: 'Union',
      boolean_subtract: 'Subtract',
      boolean_intersect: 'Intersect',
    };
    const label = labels[boolType] ?? boolType;
    const name = `${label} ${state.features.length + 1}`;
    const selectedIds = state.selectedIds;

    if (boolType === 'boolean_subtract') {
      if (selectedIds.length >= 2) {
        defaults.targetRef = selectedIds[0];
        defaults.toolRef = selectedIds[1];
      } else if (selectedIds.length === 1) {
        defaults.targetRef = selectedIds[0];
      }
    } else {
      if (selectedIds.length >= 2) {
        defaults.bodyRefs = selectedIds.join(',');
      }
    }

    const dependencies = selectedIds.length > 0 ? [...selectedIds] : [];
    state.addFeatureAndSelect({
      id,
      type: boolType,
      name,
      parameters: defaults,
      dependencies,
      children: [],
      suppressed: false,
    });
    state.setActiveTool('select');
  }, []);

  const handleInsertShell = useCallback(() => {
    const state = useCADStore.getState();
    const defaults = getDefaultParameters('shell');
    const id = nanoid();
    const selectedId = state.selectedIds[0];
    if (selectedId) defaults.targetRef = selectedId;
    const dependencies = selectedId ? [selectedId] : [];
    state.addFeatureAndSelect({
      id,
      type: 'shell',
      name: `Shell ${state.features.length + 1}`,
      parameters: defaults,
      dependencies,
      children: [],
      suppressed: false,
    });
    state.setActiveTool('select');
  }, []);

  const handleSetCamera = useCallback((preset: string) => {
    useViewStore.getState().setCameraPreset(preset);
  }, []);

  // Auto-save every 30s when dirty
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useCADStore.getState();
      if (state.dirty && state.documentId) {
        handleSaveDocument();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Register keyboard shortcuts on mount
  useEffect(() => {
    registerStandardCommands({
      toggleCommandPalette,
      toggleGrid: () => useViewStore.getState().toggleGrid(),
      toggleWireframe: () => useViewStore.getState().toggleWireframe(),
      setDisplayModeShadedEdges: () => useViewStore.getState().setDisplayMode('shaded_edges'),
      setDisplayModeShaded: () => useViewStore.getState().setDisplayMode('shaded'),
      setDisplayModeWireframe: () => useViewStore.getState().setDisplayMode('wireframe'),
      fitView: () => useViewStore.getState().requestFitView(),
      zoomToSelection: () => useViewStore.getState().requestZoomToSelection(),
      zoomIn: () => zoomCamera('in'),
      zoomOut: () => zoomCamera('out'),
      save: () => {
        handleSaveDocument();
      },
      undo: () => useCADStore.getState().undo(),
      redo: () => useCADStore.getState().redo(),
      newDocument: () => {
        handleNewDocument();
      },
      openDocument: () => {
        handleOpenDocument();
      },
      delete: () => {
        const state = useCADStore.getState();
        for (const id of state.selectedIds) {
          removeFeature(id);
        }
        clearSelection();
      },
      selectAll: handleSelectAll,
      copy: () => {
        const state = useCADStore.getState();
        const selected = state.features.filter((f) => state.selectedIds.includes(f.id));
        if (selected.length > 0) copyFeatures(selected);
      },
      cut: () => {
        const state = useCADStore.getState();
        const selected = state.features.filter((f) => state.selectedIds.includes(f.id));
        if (selected.length > 0) {
          cutFeatures(selected);
          for (const f of selected) state.removeFeature(f.id);
          state.clearSelection();
        }
      },
      paste: () => {
        const pasted = pasteFeatures();
        for (const f of pasted) {
          useCADStore.getState().addFeatureAndSelect(f);
        }
      },
      duplicate: handleDuplicate,
      escape: () => {
        setSketchMode(false);
        useCADStore.getState().clearSelection();
        useCADStore.getState().setActiveTool('select');
        useViewStore.getState().clearMeasurePoints();
        if (useUIStore.getState().commandPaletteOpen) {
          toggleCommandPalette();
        }
        closeContextMenu();
      },
      enterSketch: () => setSketchMode(true),
      cameraFront: () => handleSetCamera('front'),
      cameraBack: () => handleSetCamera('back'),
      cameraTop: () => handleSetCamera('top'),
      cameraBottom: () => handleSetCamera('bottom'),
      cameraRight: () => handleSetCamera('right'),
      cameraLeft: () => handleSetCamera('left'),
      cameraIso: () => handleSetCamera('iso'),
      toggleSnap: () => useViewStore.getState().toggleSnap(),
    });

    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyEvent(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleCommandPalette, clearSelection, setSketchMode, handleDuplicate, handleSelectAll, handleSetCamera]);

  // Show dashboard when no document is open
  if (!documentId) {
    return <DocumentDashboard />;
  }

  return (
    <div style={styles.root}>
      <MenuBar
        onInsert={handleInsertPrimitive}
        onInsertPattern={handleInsertPattern}
        onInsertBoolean={handleInsertBoolean}
        onInsertShell={handleInsertShell}
        onSetCamera={handleSetCamera}
        onAbout={() => setAboutOpen(true)}
      />
      <Toolbar />

      <div style={styles.main}>
        {leftPanelOpen && (
          <>
            <div style={{ ...styles.leftPanel, width: leftPanelWidth }}>
              <ErrorBoundary name="Feature Tree">
                <FeatureTree />
              </ErrorBoundary>
            </div>
            <ResizeHandle
              onResize={(delta) => setLeftPanelWidth(Math.max(150, Math.min(400, leftPanelWidth + delta)))}
            />
          </>
        )}

        <DropZone onContextMenu={openViewportContextMenu}>
          <ErrorBoundary name="Viewport">
            <Suspense fallback={null}>
              <Viewport />
            </Suspense>
          </ErrorBoundary>
          {sketchActive && (
            <ErrorBoundary name="SketchCanvas">
              <Suspense fallback={null}>
                <SketchCanvas />
              </Suspense>
            </ErrorBoundary>
          )}
          <SketchToolbar />
          <MeasurementOverlay />
          <ViewCube />
        </DropZone>

        {rightPanelOpen && (
          <>
            <ResizeHandle
              onResize={(delta) => setRightPanelWidth(Math.max(200, Math.min(450, rightPanelWidth - delta)))}
            />
            <div style={{ ...styles.rightPanel, width: rightPanelWidth, overflow: 'auto' }}>
              <ErrorBoundary name="Properties Panel">
                <PropertiesPanel />
              </ErrorBoundary>
              <CollabPanel />
            </div>
          </>
        )}
      </div>

      <StatusBar />
      <CommandPalette />
      <ToastContainer />
      <ConfirmDialogContainer />
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={closeContextMenu} />
      )}
      {aboutOpen && (
        <div style={aboutOverlayStyle} onClick={() => setAboutOpen(false)}>
          <div style={aboutDialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={aboutTitleStyle}>OpenCAD</div>
            <div style={aboutVersionStyle}>Version 0.1.0</div>
            <div style={aboutDescStyle}>
              Open-source, web-native parametric 3D CAD platform. Built with React, Three.js, and TypeScript.
            </div>
            <button style={aboutCloseBtnStyle} onClick={() => setAboutOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Resize Handle for panel dragging
// ============================================================

function ResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        startX.current = ev.clientX;
        onResize(delta);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [onResize],
  );

  return <div style={resizeHandleStyle} onMouseDown={onMouseDown} />;
}

const resizeHandleStyle: React.CSSProperties = {
  width: 4,
  cursor: 'col-resize',
  background: 'transparent',
  flexShrink: 0,
  position: 'relative',
  zIndex: 10,
};

// ============================================================
// Drop Zone for file import
// ============================================================

function DropZone({
  children,
  onContextMenu,
}: {
  children: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragCount = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragging(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current--;
    if (dragCount.current === 0) {
      setDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current = 0;
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'stl') {
        const buffer = await file.arrayBuffer();
        const { importSTL } = await import('../../cad/io/stl-importer');
        importSTL(buffer, file.name);
        const feature = {
          id: crypto.randomUUID(),
          type: 'extrude' as const,
          name: file.name.replace(/\.[^.]+$/, ''),
          parameters: {},
          dependencies: [] as string[],
          children: [] as string[],
          suppressed: false,
        };
        useCADStore.getState().addFeatureAndSelect(feature);
      } else if (ext === 'obj') {
        const text = await file.text();
        const { importOBJ } = await import('../../cad/io/obj-importer');
        importOBJ(text, file.name);
        const feature = {
          id: crypto.randomUUID(),
          type: 'extrude' as const,
          name: file.name.replace(/\.[^.]+$/, ''),
          parameters: {},
          dependencies: [] as string[],
          children: [] as string[],
          suppressed: false,
        };
        useCADStore.getState().addFeatureAndSelect(feature);
      }
    }
  }, []);

  return (
    <div
      style={{ ...styles.viewport, position: 'relative' }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
    >
      {children}
      {dragging && (
        <div style={dropOverlayStyle}>
          <div style={dropContentStyle}>
            <div style={dropIconStyle}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>Drop STL or OBJ file</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>File will be imported as a new feature</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Menu Bar with Dropdowns
// ============================================================

function MenuBar({
  onInsert,
  onInsertPattern,
  onInsertBoolean,
  onInsertShell,
  onSetCamera,
  onAbout,
}: {
  onInsert: (toolType: ToolType) => void;
  onInsertPattern: (patternType: 'pattern_linear' | 'pattern_circular' | 'mirror') => void;
  onInsertBoolean: (boolType: 'boolean_union' | 'boolean_subtract' | 'boolean_intersect') => void;
  onInsertShell: () => void;
  onSetCamera: (preset: string) => void;
  onAbout: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        {
          type: 'item',
          label: 'New',
          shortcut: 'Ctrl+N',
          action: () => {
            handleNewDocument();
          },
        },
        {
          type: 'item',
          label: 'Open',
          shortcut: 'Ctrl+O',
          action: () => {
            handleOpenDocument();
          },
        },
        {
          type: 'item',
          label: 'Save',
          shortcut: 'Ctrl+S',
          action: () => {
            handleSaveDocument();
          },
        },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Export STL',
          action: () => {
            handleExport('stl');
          },
        },
        {
          type: 'item',
          label: 'Export OBJ',
          action: () => {
            handleExport('obj');
          },
        },
        {
          type: 'item',
          label: 'Export GLB',
          action: () => {
            handleExport('glb');
          },
        },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Export .ocad',
          action: () => {
            handleExport('ocad');
          },
        },
        {
          type: 'item',
          label: 'Import STL/OBJ',
          action: () => {
            handleImportFile();
          },
        },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Screenshot (PNG)',
          shortcut: 'Ctrl+Shift+S',
          action: () => {
            handleScreenshot();
          },
        },
      ],
    },
    {
      label: 'Edit',
      items: [
        { type: 'item', label: 'Undo', shortcut: 'Ctrl+Z', action: () => useCADStore.getState().undo() },
        { type: 'item', label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => useCADStore.getState().redo() },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Cut',
          shortcut: 'Ctrl+X',
          action: () => {
            const state = useCADStore.getState();
            const selected = state.features.filter((f) => state.selectedIds.includes(f.id));
            if (selected.length > 0) {
              cutFeatures(selected);
              for (const f of selected) state.removeFeature(f.id);
              state.clearSelection();
            }
          },
        },
        {
          type: 'item',
          label: 'Copy',
          shortcut: 'Ctrl+C',
          action: () => {
            const state = useCADStore.getState();
            const selected = state.features.filter((f) => state.selectedIds.includes(f.id));
            if (selected.length > 0) copyFeatures(selected);
          },
        },
        {
          type: 'item',
          label: 'Paste',
          shortcut: 'Ctrl+V',
          action: () => {
            const pasted = pasteFeatures();
            for (const f of pasted) {
              useCADStore.getState().addFeatureAndSelect(f);
            }
          },
        },
        {
          type: 'item',
          label: 'Duplicate',
          shortcut: 'Ctrl+D',
          action: () => {
            const state = useCADStore.getState();
            for (const id of state.selectedIds) {
              state.duplicateFeature(id);
            }
          },
        },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Select All',
          shortcut: 'Ctrl+A',
          action: () => {
            const features = useCADStore.getState().features;
            useCADStore.getState().select(features.map((f) => f.id));
          },
        },
        {
          type: 'item',
          label: 'Delete',
          shortcut: 'Del',
          action: () => {
            const state = useCADStore.getState();
            for (const id of state.selectedIds) {
              useCADStore.getState().removeFeature(id);
            }
            useCADStore.getState().clearSelection();
          },
        },
      ],
    },
    {
      label: 'View',
      items: [
        { type: 'item', label: 'Front', shortcut: '1', action: () => onSetCamera('front') },
        { type: 'item', label: 'Back', shortcut: '4', action: () => onSetCamera('back') },
        { type: 'item', label: 'Top', shortcut: '2', action: () => onSetCamera('top') },
        { type: 'item', label: 'Bottom', shortcut: '5', action: () => onSetCamera('bottom') },
        { type: 'item', label: 'Right', shortcut: '3', action: () => onSetCamera('right') },
        { type: 'item', label: 'Left', shortcut: '6', action: () => onSetCamera('left') },
        { type: 'item', label: 'Isometric', shortcut: '0', action: () => onSetCamera('iso') },
        { type: 'separator' },
        { type: 'item', label: 'Wireframe', action: () => useViewStore.getState().setDisplayMode('wireframe') },
        { type: 'item', label: 'Shaded', action: () => useViewStore.getState().setDisplayMode('shaded') },
        { type: 'item', label: 'Shaded + Edges', action: () => useViewStore.getState().setDisplayMode('shaded_edges') },
        { type: 'separator' },
        { type: 'item', label: 'Toggle Grid', shortcut: 'G', action: () => useViewStore.getState().toggleGrid() },
        { type: 'item', label: 'Toggle Snap', shortcut: 'Shift+G', action: () => useViewStore.getState().toggleSnap() },
        {
          type: 'item',
          label: 'Toggle Wireframe',
          shortcut: 'W',
          action: () => useViewStore.getState().toggleWireframe(),
        },
        { type: 'item', label: 'Toggle Shadows', action: () => useViewStore.getState().toggleShadows() },
        { type: 'item', label: 'Fit View', shortcut: 'F', action: () => useViewStore.getState().requestFitView() },
        {
          type: 'item',
          label: 'Zoom to Selection',
          shortcut: 'Shift+F',
          action: () => useViewStore.getState().requestZoomToSelection(),
        },
        { type: 'separator' },
        { type: 'item', label: 'Section Plane', action: () => useViewStore.getState().toggleSectionPlane() },
      ],
    },
    {
      label: 'Insert',
      items: [
        { type: 'item', label: 'Box', action: () => onInsert('box') },
        { type: 'item', label: 'Cylinder', action: () => onInsert('cylinder') },
        { type: 'item', label: 'Sphere', action: () => onInsert('sphere') },
        { type: 'item', label: 'Cone', action: () => onInsert('cone') },
        { type: 'item', label: 'Torus', action: () => onInsert('torus') },
        { type: 'item', label: 'Hole', action: () => onInsert('hole') },
        { type: 'separator' },
        { type: 'item', label: 'Union', action: () => onInsertBoolean('boolean_union') },
        { type: 'item', label: 'Subtract', action: () => onInsertBoolean('boolean_subtract') },
        { type: 'item', label: 'Intersect', action: () => onInsertBoolean('boolean_intersect') },
        { type: 'separator' },
        { type: 'item', label: 'Shell', action: () => onInsertShell() },
        { type: 'separator' },
        { type: 'item', label: 'Linear Pattern', action: () => onInsertPattern('pattern_linear') },
        { type: 'item', label: 'Circular Pattern', action: () => onInsertPattern('pattern_circular') },
        { type: 'item', label: 'Mirror', action: () => onInsertPattern('mirror') },
      ],
    },
    {
      label: 'Tools',
      items: [
        {
          type: 'item',
          label: 'Measure',
          shortcut: 'M',
          action: () => useCADStore.getState().setActiveTool('measure'),
        },
        { type: 'item', label: 'Section Plane', action: () => useViewStore.getState().toggleSectionPlane() },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Command Palette',
          shortcut: 'Ctrl+K',
          action: () => useUIStore.getState().toggleCommandPalette(),
        },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Share Session',
          action: () => {
            // Toggle right panel to show collab panel
            const state = useUIStore.getState();
            if (!state.rightPanelOpen) state.toggleRightPanel();
          },
        },
      ],
    },
    {
      label: 'Help',
      items: [
        {
          type: 'item',
          label: 'Keyboard Shortcuts',
          shortcut: 'Ctrl+K',
          action: () => useUIStore.getState().toggleCommandPalette(),
        },
        { type: 'item', label: 'About OpenCAD', action: onAbout },
      ],
    },
  ];

  // Close on click outside
  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  return (
    <div ref={barRef} style={menuStyles.bar}>
      <span style={menuStyles.logo}>OpenCAD</span>
      <div style={menuStyles.menus}>
        {menus.map((menu) => (
          <div
            key={menu.label}
            style={menuStyles.menuWrapper}
            onMouseEnter={() => {
              if (openMenu && openMenu !== menu.label) {
                setOpenMenu(menu.label);
              }
            }}
          >
            <button
              style={{
                ...menuStyles.button,
                ...(openMenu === menu.label ? menuStyles.activeButton : {}),
              }}
              onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div style={menuStyles.dropdown}>
                {menu.items.map((item, i) =>
                  item.type === 'separator' ? (
                    <div key={`sep-${i}`} style={menuStyles.separator} />
                  ) : (
                    <button
                      key={item.label}
                      style={{
                        ...menuStyles.menuItem,
                        ...(item.disabled ? menuStyles.menuItemDisabled : {}),
                      }}
                      onClick={() => {
                        item.action();
                        setOpenMenu(null);
                      }}
                      disabled={item.disabled}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span style={menuStyles.shortcut}>{item.shortcut}</span>}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    background: '#0f172a',
    overflow: 'hidden',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    flexShrink: 0,
  },
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  rightPanel: {
    flexShrink: 0,
  },
};

const menuStyles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    height: 32,
    padding: '0 8px',
    background: '#0f172a',
    borderBottom: '1px solid #1e293b',
    gap: 4,
    zIndex: 100,
  },
  logo: {
    fontSize: 13,
    fontWeight: 700,
    color: '#3b82f6',
    marginRight: 16,
    letterSpacing: '-0.02em',
  },
  menus: {
    display: 'flex',
    gap: 0,
  },
  menuWrapper: {
    position: 'relative',
  },
  button: {
    padding: '2px 10px',
    fontSize: 12,
    color: '#94a3b8',
    borderRadius: 3,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  activeButton: {
    background: '#1e293b',
    color: '#e2e8f0',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: 200,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 4,
    padding: '4px 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    zIndex: 200,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '4px 12px',
    fontSize: 12,
    color: '#e2e8f0',
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    textAlign: 'left',
  },
  menuItemDisabled: {
    color: '#475569',
    cursor: 'default',
  },
  separator: {
    height: 1,
    background: '#334155',
    margin: '4px 0',
  },
  shortcut: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 24,
  },
};

const dropOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  border: '2px dashed #3b82f6',
  borderRadius: 4,
  pointerEvents: 'none',
};

const dropContentStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const dropIconStyle: React.CSSProperties = {
  marginBottom: 8,
};

const aboutOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const aboutDialogStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '24px 32px',
  maxWidth: 360,
  textAlign: 'center',
};

const aboutTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#3b82f6',
  marginBottom: 4,
};

const aboutVersionStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  marginBottom: 16,
};

const aboutDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#94a3b8',
  lineHeight: 1.5,
  marginBottom: 20,
};

const aboutCloseBtnStyle: React.CSSProperties = {
  padding: '6px 20px',
  fontSize: 12,
  color: '#e2e8f0',
  background: '#334155',
  border: '1px solid #475569',
  borderRadius: 4,
  cursor: 'pointer',
};
