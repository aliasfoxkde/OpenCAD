import { useCADStore } from '../../stores/cad-store';

export function StatusBar() {
  const activeTool = useCADStore((s) => s.activeTool);
  const features = useCADStore((s) => s.features);
  const selectedIds = useCADStore((s) => s.selectedIds);

  return (
    <div style={styles.bar}>
      <span style={styles.item}>Tool: {activeTool}</span>
      <span style={styles.separator}>|</span>
      <span style={styles.item}>Features: {features.length}</span>
      <span style={styles.separator}>|</span>
      <span style={styles.item}>
        Selected: {selectedIds.length > 0 ? selectedIds.length : 'none'}
      </span>
      <span style={{ flex: 1 }} />
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
};
