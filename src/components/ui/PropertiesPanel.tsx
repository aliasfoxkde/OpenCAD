import { useCADStore } from '../../stores/cad-store';
import { getDefaultParameters, getFeatureDefinition } from '../../cad/features';
import { nanoid } from 'nanoid';
import type { ParameterDef } from '../../cad/features';
import type { FeatureType } from '../../types/cad';

/** Map primitive ToolType to feature-registry type */
const primitiveTypeMap: Record<string, FeatureType> = {
  box: 'extrude',
  cylinder: 'revolve',
  sphere: 'sphere',
  cone: 'cone',
  torus: 'torus',
};

/** Primitives for the Create section */
const primitives = [
  { type: 'box', label: 'Box' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'sphere', label: 'Sphere' },
  { type: 'cone', label: 'Cone' },
  { type: 'torus', label: 'Torus' },
];

export function PropertiesPanel() {
  const selectedIds = useCADStore((s) => s.selectedIds);
  const features = useCADStore((s) => s.features);
  const updateFeature = useCADStore((s) => s.updateFeature);
  const addFeature = useCADStore((s) => s.addFeature);

  const selectedFeature = features.find((f) => selectedIds.includes(f.id));
  const featureDef = selectedFeature ? getFeatureDefinition(selectedFeature.type) : undefined;

  const handleCreatePrimitive = (primitiveType: string) => {
    const featureType = primitiveTypeMap[primitiveType];
    if (!featureType) return;

    const defaults = getDefaultParameters(featureType);
    addFeature({
      id: nanoid(),
      type: featureType,
      name: `${primitiveType.charAt(0).toUpperCase() + primitiveType.slice(1)} ${features.length + 1}`,
      parameters: defaults,
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
      {selectedFeature && featureDef && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Properties — {selectedFeature.name}
          </div>
          <div style={styles.typeLabel}>
            {featureDef.icon} {featureDef.label}
          </div>
          {featureDef.parameters
            .filter((p) => p.type === 'number')
            .map((paramDef) => (
              <ParameterInput
                key={paramDef.name}
                paramDef={paramDef}
                value={(selectedFeature.parameters[paramDef.name] as number) ?? paramDef.default as number}
                onChange={(v) => handleParamChange(paramDef.name, v)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function ParameterInput({
  paramDef,
  value,
  onChange,
}: {
  paramDef: ParameterDef;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={styles.paramRow}>
      <label style={styles.paramLabel}>
        {paramDef.label}
        {paramDef.unit && (
          <span style={styles.paramUnit}> {paramDef.unit}</span>
        )}
      </label>
      <input
        type="number"
        style={styles.paramInput}
        value={value}
        min={paramDef.min}
        max={paramDef.max}
        step={paramDef.step ?? 0.1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
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
  typeLabel: {
    fontSize: 12,
    color: '#e2e8f0',
    marginBottom: 8,
    fontWeight: 500,
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
    width: 80,
  },
  paramUnit: {
    color: '#475569',
    fontSize: 10,
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
