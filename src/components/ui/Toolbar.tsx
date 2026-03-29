import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import type { ToolType } from '../../types/cad';

const tools: { id: ToolType; label: string; shortcut: string }[] = [
  { id: 'select', label: 'Select', shortcut: 'V' },
  { id: 'box', label: 'Box', shortcut: 'B' },
  { id: 'cylinder', label: 'Cylinder', shortcut: 'C' },
  { id: 'sphere', label: 'Sphere', shortcut: 'S' },
  { id: 'cone', label: 'Cone', shortcut: '' },
  { id: 'torus', label: 'Torus', shortcut: '' },
  { id: 'fillet', label: 'Fillet', shortcut: '' },
  { id: 'chamfer', label: 'Chamfer', shortcut: '' },
  { id: 'measure', label: 'Measure', shortcut: 'M' },
  { id: 'section', label: 'Section', shortcut: '' },
];

export function Toolbar() {
  const activeTool = useCADStore((s) => s.activeTool);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const showGrid = useViewStore((s) => s.showGrid);
  const showAxes = useViewStore((s) => s.showAxes);
  const toggleGrid = useViewStore((s) => s.toggleGrid);
  const toggleAxes = useViewStore((s) => s.toggleAxes);

  return (
    <div style={styles.toolbar}>
      <div style={styles.group}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            style={{
              ...styles.button,
              ...(activeTool === tool.id ? styles.active : {}),
            }}
            onClick={() => setActiveTool(tool.id)}
            title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div style={styles.divider} />
      <div style={styles.group}>
        <button
          style={{ ...styles.button, ...(showGrid ? styles.toggleOn : {}) }}
          onClick={toggleGrid}
          title="Toggle Grid (G)"
        >
          Grid
        </button>
        <button
          style={{ ...styles.button, ...(showAxes ? styles.toggleOn : {}) }}
          onClick={toggleAxes}
          title="Toggle Axes"
        >
          Axes
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    height: 40,
    overflow: 'hidden',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    height: 24,
    background: '#334155',
    margin: '0 4px',
  },
  button: {
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 12,
    color: '#94a3b8',
    background: 'transparent',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  active: {
    background: '#3b82f6',
    color: '#ffffff',
    border: '1px solid #2563eb',
  },
  toggleOn: {
    background: '#334155',
    color: '#f1f5f9',
    border: '1px solid #475569',
  },
};
