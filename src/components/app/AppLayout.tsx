import { useEffect } from 'react';
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
import { useSketchStore } from '../../stores/sketch-store';
import { handleKeyEvent, registerStandardCommands } from '../../hooks/useKeyboardShortcuts';

export function AppLayout() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const sketchActive = useSketchStore((s) => s.active);
  const documentId = useCADStore((s) => s.documentId);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const clearSelection = useCADStore((s) => s.clearSelection);
  const removeFeature = useCADStore((s) => s.removeFeature);
  const setSketchMode = useCADStore((s) => s.setSketchMode);

  // Register keyboard shortcuts on mount
  useEffect(() => {
    registerStandardCommands({
      toggleCommandPalette,
      toggleGrid: () => {},
      toggleWireframe: () => {},
      fitView: () => {},
      zoomIn: () => {},
      zoomOut: () => {},
      save: () => {},
      undo: () => {},
      redo: () => {},
      newDocument: () => {},
      openDocument: () => {},
      delete: () => {
        const state = useCADStore.getState();
        for (const id of state.selectedIds) {
          removeFeature(id);
        }
        clearSelection();
      },
      selectAll: () => {},
      copy: () => {},
      paste: () => {},
      escape: () => {
        setSketchMode(false);
        if (useUIStore.getState().commandPaletteOpen) {
          toggleCommandPalette();
        }
      },
      enterSketch: () => setSketchMode(true),
    });

    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyEvent(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleCommandPalette, clearSelection, setSketchMode]);

  // Show dashboard when no document is open
  if (!documentId) {
    return <DocumentDashboard />;
  }

  return (
    <div style={styles.root}>
      {/* Menu Bar */}
      <MenuBar />

      {/* Toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div style={styles.main}>
        {/* Left panel - Feature Tree */}
        {leftPanelOpen && (
          <div style={styles.leftPanel}>
            <FeatureTree />
          </div>
        )}

        {/* 3D Viewport + Sketch Overlay */}
        <div style={styles.viewport}>
          <Viewport />
          {sketchActive && <SketchCanvas />}
          <SketchToolbar />
        </div>

        {/* Right panel - Properties */}
        {rightPanelOpen && (
          <div style={styles.rightPanel}>
            <PropertiesPanel />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette (modal overlay) */}
      <CommandPalette />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

function MenuBar() {
  return (
    <div style={menuStyles.bar}>
      <span style={menuStyles.logo}>OpenCAD</span>
      <div style={menuStyles.menus}>
        <MenuButton label="File" />
        <MenuButton label="Edit" />
        <MenuButton label="View" />
        <MenuButton label="Insert" />
        <MenuButton label="Tools" />
        <MenuButton label="Help" />
      </div>
    </div>
  );
}

function MenuButton({ label }: { label: string }) {
  return (
    <button style={menuStyles.button}>
      {label}
    </button>
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
  button: {
    padding: '2px 10px',
    fontSize: 12,
    color: '#94a3b8',
    borderRadius: 3,
  },
};
