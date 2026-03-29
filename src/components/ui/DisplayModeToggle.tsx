/**
 * Display mode toggle buttons for switching between wireframe,
 * shaded, and shaded+edges modes. Also provides toggles for
 * grid, axes, and shadows.
 */

import { useViewStore } from '../../stores/view-store';
import type { DisplayMode } from '../../types/cad';

const DISPLAY_MODES: { mode: DisplayMode; label: string; icon: string }[] = [
  { mode: 'wireframe', label: 'Wireframe', icon: '\u25A1' },
  { mode: 'shaded', label: 'Shaded', icon: '\u25A0' },
  { mode: 'shaded_edges', label: 'Shaded+Edges', icon: '\u25A2' },
];

export function DisplayModeToggle() {
  const displayMode = useViewStore((s) => s.displayMode);
  const setDisplayMode = useViewStore((s) => s.setDisplayMode);
  const showGrid = useViewStore((s) => s.showGrid);
  const showAxes = useViewStore((s) => s.showAxes);
  const showShadows = useViewStore((s) => s.showShadows);
  const toggleGrid = useViewStore((s) => s.toggleGrid);
  const toggleAxes = useViewStore((s) => s.toggleAxes);
  const toggleShadows = useViewStore((s) => s.toggleShadows);

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        {DISPLAY_MODES.map(({ mode, label, icon }) => (
          <button
            key={mode}
            style={{
              ...styles.modeBtn,
              ...(displayMode === mode ? styles.modeBtnActive : {}),
            }}
            onClick={() => setDisplayMode(mode)}
            title={label}
          >
            <span style={styles.modeIcon}>{icon}</span>
            <span style={styles.modeLabel}>{label}</span>
          </button>
        ))}
      </div>
      <div style={styles.divider} />
      <div style={styles.row}>
        <ToggleBtn label="Grid" active={showGrid} onClick={toggleGrid} />
        <ToggleBtn label="Axes" active={showAxes} onClick={toggleAxes} />
        <ToggleBtn label="Shadows" active={showShadows} onClick={toggleShadows} />
      </div>
    </div>
  );
}

function ToggleBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      style={{
        ...styles.toggleBtn,
        color: active ? '#3b82f6' : '#64748b',
      }}
      onClick={onClick}
    >
      <span style={styles.toggleIndicator}>{active ? '\u25CF' : '\u25CB'}</span>
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '6px 4px',
  },
  row: {
    display: 'flex',
    gap: 2,
  },
  divider: {
    height: 1,
    background: '#334155',
    margin: '4px 0',
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    fontSize: 11,
    color: '#94a3b8',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 3,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  modeBtnActive: {
    background: '#334155',
    color: '#f1f5f9',
    borderColor: '#475569',
  },
  modeIcon: {
    fontSize: 12,
    width: 14,
    textAlign: 'center' as const,
  },
  modeLabel: {
    fontSize: 11,
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    fontSize: 11,
    background: 'transparent',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
  },
  toggleIndicator: {
    fontSize: 8,
  },
};
