import { useCADStore, useCanUndoRedo } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useUIStore } from '../../stores/ui-store';
import { getFeatureDefinition } from '../../cad/features';
import type { Unit } from '../../types/store';
import { UNIT_CONVERSION } from '../../types/store';

const UNIT_CYCLE: Unit[] = ['mm', 'cm', 'm', 'in', 'ft'];

/** Pretty-print active tool name */
function formatToolName(tool: string): string {
  const map: Record<string, string> = {
    select: 'Select',
    box: 'Box',
    cylinder: 'Cylinder',
    sphere: 'Sphere',
    cone: 'Cone',
    torus: 'Torus',
    hole: 'Hole',
    boolean_union: 'Union',
    boolean_subtract: 'Subtract',
    boolean_intersect: 'Intersect',
    fillet: 'Fillet',
    chamfer: 'Chamfer',
    pattern_linear: 'Linear Pattern',
    pattern_circular: 'Circular Pattern',
    mirror: 'Mirror',
    shell: 'Shell',
    measure: 'Measure',
    section: 'Section',
    sketch: 'Sketch',
  };
  return map[tool] ?? tool;
}

/** Build selection info string from store state */
export function buildSelectionInfo(
  selectedIds: string[],
  features: { id: string; name: string; type: string }[],
): string {
  if (selectedIds.length === 0) return 'none';
  if (selectedIds.length === 1) {
    const feature = features.find((f) => f.id === selectedIds[0]);
    if (!feature) return selectedIds[0]!;
    const def = getFeatureDefinition(feature.type);
    const icon = def?.icon ?? '';
    return `${icon} ${feature.name}`;
  }
  return `${selectedIds.length} selected`;
}

export function StatusBar() {
  const activeTool = useCADStore((s) => s.activeTool);
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const dirty = useCADStore((s) => s.dirty);
  const units = useCADStore((s) => s.units);
  const setUnits = useCADStore((s) => s.setUnits);
  const { canUndo, canRedo } = useCanUndoRedo();
  const cameraPreset = useViewStore((s) => s.cameraPreset);
  const displayMode = useViewStore((s) => s.displayMode);
  const showGrid = useViewStore((s) => s.showGrid);
  const snapToGrid = useViewStore((s) => s.snapToGrid);
  const gridSnapSize = useViewStore((s) => s.gridSnapSize);
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  const selectionInfo = buildSelectionInfo(selectedIds, features);

  return (
    <div style={styles.bar}>
      <StatusBarButton
        label="Tree"
        active={leftPanelOpen}
        onClick={toggleLeftPanel}
      />
      <StatusBarButton
        label="Props"
        active={rightPanelOpen}
        onClick={toggleRightPanel}
      />
      <span style={styles.separator}>|</span>
      <span style={styles.toolLabel}>{formatToolName(activeTool)}</span>
      {dirty && <span style={styles.dirtyDot}>*</span>}
      <span style={styles.separator}>|</span>
      <span style={styles.item}>{features.length} feature{features.length !== 1 ? 's' : ''}</span>
      {selectedIds.length > 0 && (
        <>
          <span style={styles.separator}>|</span>
          <span style={styles.selectionItem}>{selectionInfo}</span>
        </>
      )}
      <span style={{ flex: 1 }} />
      <span style={styles.item}>
        {displayMode === 'wireframe' ? 'Wire' : displayMode === 'shaded' ? 'Shaded' : 'Shaded+Edges'}
      </span>
      {!showGrid && <span style={styles.dimItem}>Grid off</span>}
      {snapToGrid && <span style={styles.snapIndicator}>Snap: {gridSnapSize}mm</span>}
      {canUndo && <span style={styles.dimItem}>Ctrl+Z</span>}
      {canRedo && <span style={styles.dimItem}>Ctrl+Shift+Z</span>}
      {cameraPreset && <span style={styles.indicator}>{cameraPreset}</span>}
      <span
        style={styles.unitsBtn}
        onClick={() => {
          const idx = UNIT_CYCLE.indexOf(units);
          const next = UNIT_CYCLE[(idx + 1) % UNIT_CYCLE.length]!;
          setUnits(next);
        }}
        title={`Click to change units (1 ${units} = ${UNIT_CONVERSION[units]} mm)`}
      >
        {units}
      </span>
      <span style={styles.separator}>|</span>
      <span style={styles.version}>OpenCAD v0.1.0</span>
    </div>
  );
}

function StatusBarButton({
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
        ...styles.panelBtn,
        ...(active ? styles.panelBtnActive : {}),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '0 12px',
    height: 24,
    background: '#1e293b',
    borderTop: '1px solid #334155',
    fontSize: 11,
    color: '#64748b',
  },
  item: {
    color: '#64748b',
  },
  dimItem: {
    color: '#475569',
    fontSize: 10,
    marginRight: 8,
  },
  separator: {
    color: '#334155',
    margin: '0 8px',
  },
  indicator: {
    color: '#3b82f6',
    fontSize: 10,
    marginRight: 8,
  },
  snapIndicator: {
    color: '#22d3ee',
    fontSize: 10,
    marginRight: 8,
  },
  unitsBtn: {
    color: '#94a3b8',
    fontSize: 11,
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 2,
    padding: '0 3px',
  },
  dirtyDot: {
    color: '#f59e0b',
    fontSize: 14,
    marginLeft: 2,
    lineHeight: 1,
  },
  toolLabel: {
    color: '#e2e8f0',
    fontWeight: 600,
    fontSize: 11,
  },
  selectionItem: {
    color: '#22d3ee',
    fontSize: 11,
  },
  version: {
    color: '#475569',
    fontSize: 10,
  },
  panelBtn: {
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 3,
    padding: '1px 6px',
    fontSize: 10,
    color: '#64748b',
    cursor: 'pointer',
    marginRight: 2,
  },
  panelBtnActive: {
    background: '#334155',
    color: '#e2e8f0',
    borderColor: '#475569',
  },
};
