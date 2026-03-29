import { useEffect, useState, useRef, useCallback } from 'react';
import { Viewport } from '../viewport/Viewport';
import { Toolbar } from '../ui/Toolbar';
import { FeatureTree } from '../ui/FeatureTree';
import { PropertiesPanel } from '../ui/PropertiesPanel';
import { StatusBar } from '../ui/StatusBar';
import { SketchCanvas } from '../sketcher/SketchCanvas';
import { SketchToolbar } from '../sketcher/SketchToolbar';
import { CommandPalette } from '../ui/CommandPalette';
import { DocumentDashboard } from '../ui/DocumentDashboard';
import { ToastContainer } from '../ui/Toast';
import { useUIStore } from '../../stores/ui-store';
import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useSketchStore } from '../../stores/sketch-store';
import { handleKeyEvent, registerStandardCommands } from '../../hooks/useKeyboardShortcuts';
import { getDefaultParameters } from '../../cad/features';
import { nanoid } from 'nanoid';
import { handleNewDocument, handleOpenDocument, handleSaveDocument, handleExport, handleImportFile } from '../../lib/file-actions';
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
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const clearSelection = useCADStore((s) => s.clearSelection);
  const removeFeature = useCADStore((s) => s.removeFeature);
  const setSketchMode = useCADStore((s) => s.setSketchMode);

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
      id, type: featureType, name,
      parameters: defaults, dependencies: [], children: [], suppressed: false,
    });
    state.setActiveTool('select');
  }, []);

  const handleSetCamera = useCallback((preset: string) => {
    useViewStore.getState().setCameraPreset(preset);
  }, []);

  // Register keyboard shortcuts on mount
  useEffect(() => {
    registerStandardCommands({
      toggleCommandPalette,
      toggleGrid: () => useViewStore.getState().toggleGrid(),
      toggleWireframe: () => useViewStore.getState().toggleWireframe(),
      fitView: () => {},
      zoomIn: () => {},
      zoomOut: () => {},
      save: () => { handleSaveDocument(); },
      undo: () => useCADStore.getState().undo(),
      redo: () => useCADStore.getState().redo(),
      newDocument: () => { handleNewDocument(); },
      openDocument: () => { handleOpenDocument(); },
      delete: () => {
        const state = useCADStore.getState();
        for (const id of state.selectedIds) {
          removeFeature(id);
        }
        clearSelection();
      },
      selectAll: handleSelectAll,
      copy: () => {},
      paste: () => {},
      duplicate: handleDuplicate,
      escape: () => {
        setSketchMode(false);
        if (useUIStore.getState().commandPaletteOpen) {
          toggleCommandPalette();
        }
      },
      enterSketch: () => setSketchMode(true),
      cameraFront: () => handleSetCamera('front'),
      cameraBack: () => handleSetCamera('back'),
      cameraTop: () => handleSetCamera('top'),
      cameraBottom: () => handleSetCamera('bottom'),
      cameraRight: () => handleSetCamera('right'),
      cameraLeft: () => handleSetCamera('left'),
      cameraIso: () => handleSetCamera('iso'),
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
        onSetCamera={handleSetCamera}
      />
      <Toolbar />

      <div style={styles.main}>
        {leftPanelOpen && (
          <div style={styles.leftPanel}>
            <FeatureTree />
          </div>
        )}

        <DropZone>
          <Viewport />
          {sketchActive && <SketchCanvas />}
          <SketchToolbar />
        </DropZone>

        {rightPanelOpen && (
          <div style={styles.rightPanel}>
            <PropertiesPanel />
          </div>
        )}
      </div>

      <StatusBar />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}

// ============================================================
// Drop Zone for file import
// ============================================================

function DropZone({ children }: { children: React.ReactNode }) {
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
  onSetCamera,
}: {
  onInsert: (toolType: ToolType) => void;
  onSetCamera: (preset: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { type: 'item', label: 'New', shortcut: 'Ctrl+N', action: () => { handleNewDocument(); } },
        { type: 'item', label: 'Open', shortcut: 'Ctrl+O', action: () => { handleOpenDocument(); } },
        { type: 'item', label: 'Save', shortcut: 'Ctrl+S', action: () => { handleSaveDocument(); } },
        { type: 'separator' },
        { type: 'item', label: 'Export STL', action: () => { handleExport('stl'); } },
        { type: 'item', label: 'Export OBJ', action: () => { handleExport('obj'); } },
        { type: 'item', label: 'Export GLB', action: () => { handleExport('glb'); } },
        { type: 'separator' },
        { type: 'item', label: 'Export .ocad', action: () => { handleExport('ocad'); } },
        { type: 'item', label: 'Import STL/OBJ', action: () => { handleImportFile(); } },
      ],
    },
    {
      label: 'Edit',
      items: [
        { type: 'item', label: 'Undo', shortcut: 'Ctrl+Z', action: () => useCADStore.getState().undo() },
        { type: 'item', label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => useCADStore.getState().redo() },
        { type: 'separator' },
        { type: 'item', label: 'Cut', shortcut: 'Ctrl+X', action: () => {} },
        { type: 'item', label: 'Copy', shortcut: 'Ctrl+C', action: () => {} },
        { type: 'item', label: 'Paste', shortcut: 'Ctrl+V', action: () => {} },
        { type: 'item', label: 'Duplicate', shortcut: 'Ctrl+D', action: () => {
          const state = useCADStore.getState();
          for (const id of state.selectedIds) {
            state.duplicateFeature(id);
          }
        }},
        { type: 'separator' },
        { type: 'item', label: 'Select All', shortcut: 'Ctrl+A', action: () => {
          const features = useCADStore.getState().features;
          useCADStore.getState().select(features.map((f) => f.id));
        }},
        { type: 'item', label: 'Delete', shortcut: 'Del', action: () => {
          const state = useCADStore.getState();
          for (const id of state.selectedIds) {
            useCADStore.getState().removeFeature(id);
          }
          useCADStore.getState().clearSelection();
        }},
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
        { type: 'item', label: 'Toggle Grid', shortcut: 'G', action: () => useViewStore.getState().toggleGrid() },
        { type: 'item', label: 'Toggle Wireframe', shortcut: 'W', action: () => useViewStore.getState().toggleWireframe() },
        { type: 'item', label: 'Toggle Shadows', action: () => useViewStore.getState().toggleShadows() },
        { type: 'item', label: 'Fit View', shortcut: 'F', action: () => {} },
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
      ],
    },
    {
      label: 'Tools',
      items: [
        { type: 'item', label: 'Measure', shortcut: 'M', action: () => useCADStore.getState().setActiveTool('measure') },
        { type: 'item', label: 'Section', action: () => useCADStore.getState().setActiveTool('section') },
        { type: 'separator' },
        { type: 'item', label: 'Command Palette', shortcut: 'Ctrl+K', action: () => useUIStore.getState().toggleCommandPalette() },
      ],
    },
    {
      label: 'Help',
      items: [
        { type: 'item', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K', action: () => useUIStore.getState().toggleCommandPalette() },
        { type: 'item', label: 'About OpenCAD', action: () => {} },
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
                      {item.shortcut && (
                        <span style={menuStyles.shortcut}>{item.shortcut}</span>
                      )}
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
    width: 220,
    minWidth: 180,
    maxWidth: 320,
    flexShrink: 0,
  },
  viewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  rightPanel: {
    width: 260,
    minWidth: 200,
    maxWidth: 360,
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
