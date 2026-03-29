import { Viewport } from '../viewport/Viewport';
import { Toolbar } from '../ui/Toolbar';
import { FeatureTree } from '../ui/FeatureTree';
import { PropertiesPanel } from '../ui/PropertiesPanel';
import { StatusBar } from '../ui/StatusBar';
import { useUIStore } from '../../stores/ui-store';

export function AppLayout() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

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

        {/* 3D Viewport */}
        <div style={styles.viewport}>
          <Viewport />
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
