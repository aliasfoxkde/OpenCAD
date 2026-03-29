import { useCADStore, useCanUndoRedo } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';

export function StatusBar() {
  const activeTool = useCADStore((s) => s.activeTool);
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);
  const { canUndo, canRedo } = useCanUndoRedo();
  const cameraPreset = useViewStore((s) => s.cameraPreset);

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
      <span style={styles.item}>Tool: {activeTool}</span>
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
};
