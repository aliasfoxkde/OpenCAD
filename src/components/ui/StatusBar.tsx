import { useCADStore, useCanUndoRedo } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { useUIStore } from '../../stores/ui-store';

export function StatusBar() {
  const activeTool = useCADStore((s) => s.activeTool);
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const dirty = useCADStore((s) => s.dirty);
  const { canUndo, canRedo } = useCanUndoRedo();
  const cameraPreset = useViewStore((s) => s.cameraPreset);
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  // Build selection info
  let selectionInfo: string;
  if (selectedIds.length === 0) {
    selectionInfo = 'none';
  } else if (selectedIds.length === 1) {
    const feature = features.find((f) => f.id === selectedIds[0]);
    selectionInfo = feature ? `${feature.name} (${feature.type})` : selectedIds[0]!;
  } else {
    selectionInfo = `${selectedIds.length} features`;
  }

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
      <span style={styles.item}>Tool: {activeTool}</span>
      {dirty && <span style={styles.dirtyIndicator}>Modified</span>}
      <span style={styles.separator}>|</span>
      <span style={styles.item}>Features: {features.length}</span>
      <span style={styles.separator}>|</span>
      <span style={styles.item}>Selected: {selectionInfo}</span>
      <span style={{ flex: 1 }} />
      {canUndo && <span style={styles.indicator}>Undo</span>}
      {canRedo && <span style={styles.indicator}>Redo</span>}
      {cameraPreset && <span style={styles.indicator}>Camera: {cameraPreset}</span>}
      <span style={styles.item}>mm</span>
      <span style={styles.separator}>|</span>
      <span style={styles.item}>OpenCAD v0.1.0</span>
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
    color: '#94a3b8',
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
  dirtyIndicator: {
    color: '#f59e0b',
    fontSize: 10,
    marginLeft: 4,
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
