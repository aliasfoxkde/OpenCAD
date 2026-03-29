/**
 * SketchToolbar — tool palette for the 2D sketcher.
 * Shows drawing tools, constraint tools, and sketch actions.
 */

import { useSketchStore } from '../../stores/sketch-store';
import type { SketchToolType } from '../../stores/sketch-store';
import type { ConstraintType } from '../../types/cad';

const tools: { tool: SketchToolType; label: string; icon: string }[] = [
  { tool: 'select', label: 'Select', icon: 'V' },
  { tool: 'line', label: 'Line', icon: '/' },
  { tool: 'arc', label: 'Arc', icon: ')' },
  { tool: 'circle', label: 'Circle', icon: 'O' },
  { tool: 'rectangle', label: 'Rectangle', icon: '[]' },
  { tool: 'ellipse', label: 'Ellipse', icon: '0' },
  { tool: 'spline', label: 'Spline', icon: '~' },
  { tool: 'point', label: 'Point', icon: '.' },
];

const constraintTools: { type: ConstraintType; label: string; icon: string }[] = [
  { type: 'coincident', label: 'Coincident', icon: 'o' },
  { type: 'horizontal', label: 'Horizontal', icon: '--' },
  { type: 'vertical', label: 'Vertical', icon: '|' },
  { type: 'parallel', label: 'Parallel', icon: '//' },
  { type: 'perpendicular', label: 'Perpendicular', icon: 'T' },
  { type: 'tangent', label: 'Tangent', icon: 't' },
  { type: 'equal', label: 'Equal', icon: '=' },
  { type: 'distance', label: 'Distance', icon: '<>' },
  { type: 'angle', label: 'Angle', icon: '<' },
  { type: 'radius', label: 'Radius', icon: 'R' },
  { type: 'fix', label: 'Fix', icon: '*' },
];

export function SketchToolbar() {
  const active = useSketchStore((s) => s.active);
  const tool = useSketchStore((s) => s.tool);
  const setTool = useSketchStore((s) => s.setTool);
  const exitSketch = useSketchStore((s) => s.exitSketch);
  const isFullyConstrained = useSketchStore((s) => s.isFullyConstrained);
  const degreesOfFreedom = useSketchStore((s) => s.degreesOfFreedom);

  if (!active) return null;

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Sketch Tools</div>
        <div style={styles.toolGrid}>
          {tools.map((t) => (
            <button
              key={t.tool}
              style={{
                ...styles.toolBtn,
                ...(tool === t.tool ? styles.toolBtnActive : {}),
              }}
              onClick={() => setTool(t.tool)}
              title={t.label}
            >
              <span style={styles.toolIcon}>{t.icon}</span>
              <span style={styles.toolLabel}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Constraints</div>
        <div style={styles.toolGrid}>
          {constraintTools.map((c) => (
            <button
              key={c.type}
              style={styles.toolBtn}
              onClick={() => {
                setTool('constraint');
                // pendingConstraintType would be set here
              }}
              title={c.label}
            >
              <span style={styles.toolIcon}>{c.icon}</span>
              <span style={styles.toolLabel}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.status}>
        <span style={{
          ...styles.dofIndicator,
          color: isFullyConstrained ? '#22c55e' : '#fbbf24',
        }}>
          {isFullyConstrained ? 'Fully Constrained' : `${degreesOfFreedom} DOF`}
        </span>
      </div>

      <div style={styles.actions}>
        <button style={styles.exitBtn} onClick={exitSketch}>
          Exit Sketch
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 40,
    left: 4,
    width: 120,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 4,
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  },
  section: {
    borderBottom: '1px solid #334155',
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '2px 4px',
  },
  toolGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 2,
  },
  toolBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '4px 2px',
    borderRadius: 3,
    fontSize: 10,
    color: '#94a3b8',
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
  },
  toolBtnActive: {
    background: '#334155',
    border: '1px solid #3b82f6',
    color: '#f1f5f9',
  },
  toolIcon: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  toolLabel: {
    fontSize: 8,
  },
  status: {
    padding: '4px 6px',
  },
  dofIndicator: {
    fontSize: 10,
    fontWeight: 600,
  },
  actions: {
    padding: '4px',
  },
  exitBtn: {
    width: '100%',
    padding: '6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
    background: '#334155',
    border: '1px solid #475569',
    cursor: 'pointer',
  },
};
