import { useCADStore } from '../../stores/cad-store';
import type { PrimitiveType } from '../../types/cad';
import { nanoid } from 'nanoid';

const primitives: { type: PrimitiveType; label: string }[] = [
  { type: 'box', label: 'Box' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'sphere', label: 'Sphere' },
  { type: 'cone', label: 'Cone' },
  { type: 'torus', label: 'Torus' },
];

const defaultParams: Record<PrimitiveType, Record<string, number>> = {
  box: { width: 2, height: 2, depth: 2 },
  cylinder: { radius: 0.5, height: 2 },
  sphere: { radius: 1 },
  cone: { radius: 0.5, height: 2 },
  torus: { radius: 0.5, tube: 0.15 },
};

export function PropertiesPanel() {
  const selectedIds = useCADStore((s) => s.selectedIds);
  const features = useCADStore((s) => s.features);
  const updateFeature = useCADStore((s) => s.updateFeature);
  const addFeature = useCADStore((s) => s.addFeature);

  const selectedFeature = features.find((f) => selectedIds.includes(f.id));

  const handleCreatePrimitive = (type: PrimitiveType) => {
    addFeature({
      id: nanoid(),
      type: 'extrude',
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${features.length + 1}`,
      parameters: defaultParams[type],
      dependencies: [],
      children: [],
      suppressed: false,
    });
  };

  const handleParamChange = (key: string, value: number) => {
    if (!selectedFeature) return;
    updateFeature(selectedFeature.id, {
      parameters: { ...selectedFeature.parameters, [key]: value },
    });
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Create</span>
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Primitives</div>
        <div style={styles.primitiveGrid}>
          {primitives.map((p) => (
            <button
              key={p.type}
              style={styles.primitiveBtn}
              onClick={() => handleCreatePrimitive(p.type)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {selectedFeature && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Properties - {selectedFeature.name}
          </div>
          {Object.entries(selectedFeature.parameters).map(([key, value]) => (
            <div key={key} style={styles.paramRow}>
              <label style={styles.paramLabel}>{key}</label>
              <input
                type="number"
                style={styles.paramInput}
                value={value as number}
                step={0.1}
                onChange={(e) =>
                  handleParamChange(key, parseFloat(e.target.value) || 0)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#1e293b',
    borderLeft: '1px solid #334155',
    overflow: 'auto',
  },
  header: {
    padding: '8px 12px',
    borderBottom: '1px solid #334155',
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  section: {
    padding: '8px 12px',
    borderBottom: '1px solid #334155',
  },
  sectionTitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  primitiveGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
  },
  primitiveBtn: {
    padding: '6px 4px',
    borderRadius: 4,
    fontSize: 11,
    color: '#94a3b8',
    background: '#334155',
    border: '1px solid #475569',
    textAlign: 'center',
  },
  paramRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paramLabel: {
    fontSize: 11,
    color: '#94a3b8',
    width: 60,
  },
  paramInput: {
    flex: 1,
    padding: '2px 6px',
    fontSize: 11,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 3,
    color: '#f1f5f9',
  },
};
