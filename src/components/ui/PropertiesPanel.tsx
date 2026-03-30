import { useCADStore } from '../../stores/cad-store';
import { useViewStore } from '../../stores/view-store';
import { getDefaultParameters, getFeatureDefinition } from '../../cad/features';
import { nanoid } from 'nanoid';
import type { ParameterDef } from '../../cad/features';
import type { FeatureType } from '../../types/cad';
import type { Unit } from '../../types/store';
import { UNIT_CONVERSION } from '../../types/store';
import { useMemo } from 'react';
import { computeFeatureProperties, formatPropertyValue } from '../../lib/mass-properties';
import { getChildCount } from '../../lib/assembly-tree';

/** Map primitive ToolType to feature-registry type */
const primitiveTypeMap: Record<string, FeatureType> = {
  box: 'extrude',
  cylinder: 'revolve',
  sphere: 'sphere',
  cone: 'cone',
  torus: 'torus',
  hole: 'hole',
};

/** Primitives for the Create section */
const primitives = [
  { type: 'box', label: 'Box' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'sphere', label: 'Sphere' },
  { type: 'cone', label: 'Cone' },
  { type: 'torus', label: 'Torus' },
  { type: 'hole', label: 'Hole' },
];

export function PropertiesPanel() {
  const selectedIds = useCADStore((s) => s.selectedIds);
  const features = useCADStore((s) => s.features);
  const updateFeature = useCADStore((s) => s.updateFeature);
  const addFeatureAndSelect = useCADStore((s) => s.addFeatureAndSelect);
  const sectionPlane = useViewStore((s) => s.sectionPlane);
  const toggleSectionPlane = useViewStore((s) => s.toggleSectionPlane);
  const setSectionPlaneNormal = useViewStore((s) => s.setSectionPlaneNormal);
  const setSectionPlaneOffset = useViewStore((s) => s.setSectionPlaneOffset);

  const selectedFeature = useMemo(() => features.find((f) => selectedIds.includes(f.id)), [features, selectedIds]);
  const featureDef = useMemo(() => (selectedFeature ? getFeatureDefinition(selectedFeature.type) : undefined), [selectedFeature]);
  const units = useCADStore((s) => s.units);
  const conversionFactor = UNIT_CONVERSION[units];

  // Compute mass properties for selected feature
  const massProps = useMemo(() => {
    if (!selectedFeature) return null;
    return computeFeatureProperties(features, selectedFeature.id);
  }, [features, selectedFeature]);

  const handleCreatePrimitive = (primitiveType: string) => {
    const featureType = primitiveTypeMap[primitiveType];
    if (!featureType) return;

    const defaults = getDefaultParameters(featureType);
    addFeatureAndSelect({
      id: nanoid(),
      type: featureType,
      name: `${primitiveType.charAt(0).toUpperCase() + primitiveType.slice(1)} ${features.length + 1}`,
      parameters: defaults,
      dependencies: [],
      children: [],
      suppressed: false,
    });
  };

  const handleParamChange = (key: string, value: unknown) => {
    if (!selectedFeature) return;
    updateFeature(selectedFeature.id, {
      parameters: { ...selectedFeature.parameters, [key]: value },
    });
  };

  const handleNameChange = (name: string) => {
    if (!selectedFeature) return;
    updateFeature(selectedFeature.id, { name });
  };

  const handleSuppressedToggle = () => {
    if (!selectedFeature) return;
    updateFeature(selectedFeature.id, { suppressed: !selectedFeature.suppressed });
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
            <button key={p.type} style={styles.primitiveBtn} onClick={() => handleCreatePrimitive(p.type)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {/* Section Plane controls */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Section Plane</div>
        <div style={styles.paramRow}>
          <label style={styles.paramLabel}>Enabled</label>
          <button
            style={{
              ...styles.suppressBtn,
              background: sectionPlane.enabled ? '#22d3ee' : '#334155',
              color: sectionPlane.enabled ? '#0f172a' : '#f1f5f9',
            }}
            onClick={toggleSectionPlane}
          >
            {sectionPlane.enabled ? 'On' : 'Off'}
          </button>
        </div>
        {sectionPlane.enabled && (
          <>
            <div style={styles.paramRow}>
              <label style={styles.paramLabel}>Normal</label>
              <select
                style={styles.paramSelect}
                value={sectionPlane.normal}
                onChange={(e) => setSectionPlaneNormal(e.target.value as 'x' | 'y' | 'z')}
              >
                <option value="x">X</option>
                <option value="y">Y</option>
                <option value="z">Z</option>
              </select>
            </div>
            <div style={styles.paramRow}>
              <label style={styles.paramLabel}>Offset</label>
              <input
                type="range"
                style={{ ...styles.paramInput, padding: 0, cursor: 'pointer' }}
                value={sectionPlane.offset}
                min={-20}
                max={20}
                step={0.1}
                onChange={(e) => setSectionPlaneOffset(parseFloat(e.target.value))}
              />
              <span style={{ fontSize: 10, color: '#94a3b8', width: 36, textAlign: 'right' }}>
                {sectionPlane.offset.toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>
      {selectedFeature && featureDef && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Properties</div>

          {/* Feature name */}
          <div style={styles.nameRow}>
            <input
              type="text"
              style={styles.nameInput}
              value={selectedFeature.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            <button
              style={{
                ...styles.suppressBtn,
                opacity: selectedFeature.suppressed ? 1 : 0.4,
              }}
              onClick={handleSuppressedToggle}
              title={selectedFeature.suppressed ? 'Unsuppress feature' : 'Suppress feature'}
            >
              {selectedFeature.suppressed ? 'Off' : 'On'}
            </button>
          </div>

          <div style={styles.typeLabel}>
            {featureDef.icon} {featureDef.label}
            {selectedFeature.suppressed && <span style={styles.suppressedBadge}>suppressed</span>}
          </div>
          {selectedFeature.type === 'assembly' && (
            <div style={styles.assemblyInfo}>
              Contains {getChildCount(features, selectedFeature.id)} feature
              {getChildCount(features, selectedFeature.id) !== 1 ? 's' : ''}
            </div>
          )}

          {/* All parameters */}
          {featureDef.parameters.map((paramDef) => (
            <ParameterInput
              key={paramDef.name}
              paramDef={paramDef}
              value={selectedFeature.parameters[paramDef.name] ?? paramDef.default}
              features={features}
              units={units}
              conversionFactor={conversionFactor}
              onChange={(v) => handleParamChange(paramDef.name, v)}
            />
          ))}
        </div>
      )}
      {selectedFeature && massProps && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Mass Properties</div>
          <div style={styles.massGrid}>
            <div style={styles.massItem}>
              <span style={styles.massLabel}>Volume</span>
              <span style={styles.massValue}>
                {formatPropertyValue(massProps.volume / conversionFactor ** 3, `${units}³`)}
              </span>
            </div>
            <div style={styles.massItem}>
              <span style={styles.massLabel}>Surface Area</span>
              <span style={styles.massValue}>
                {formatPropertyValue(massProps.surfaceArea / conversionFactor ** 2, `${units}²`)}
              </span>
            </div>
            {massProps.boundingBox && (
              <div style={styles.massItem}>
                <span style={styles.massLabel}>Bounding Box</span>
                <span style={styles.massValue}>
                  {((massProps.boundingBox.maxX - massProps.boundingBox.minX) / conversionFactor).toFixed(2)} x{' '}
                  {((massProps.boundingBox.maxY - massProps.boundingBox.minY) / conversionFactor).toFixed(2)} x{' '}
                  {((massProps.boundingBox.maxZ - massProps.boundingBox.minZ) / conversionFactor).toFixed(2)} {units}
                </span>
              </div>
            )}
            {massProps.centerOfMass && (
              <div style={styles.massItem}>
                <span style={styles.massLabel}>Center</span>
                <span style={styles.massValue}>
                  ({(massProps.centerOfMass.x / conversionFactor).toFixed(2)},{' '}
                  {(massProps.centerOfMass.y / conversionFactor).toFixed(2)},{' '}
                  {(massProps.centerOfMass.z / conversionFactor).toFixed(2)}) {units}
                </span>
              </div>
            )}
            <div style={styles.massItem}>
              <span style={styles.massLabel}>Triangles</span>
              <span style={styles.massValue}>{massProps.triangleCount}</span>
            </div>
          </div>
        </div>
      )}
      {!selectedFeature && (
        <div style={styles.emptyState}>
          <span style={styles.emptyText}>Select a feature to edit its properties</span>
        </div>
      )}
    </div>
  );
}

function ParameterInput({
  paramDef,
  value,
  features,
  units,
  conversionFactor,
  onChange,
}: {
  paramDef: ParameterDef;
  value: unknown;
  features: { id: string; name: string; type: string; suppressed: boolean }[];
  units: Unit;
  conversionFactor: number;
  onChange: (v: unknown) => void;
}) {
  switch (paramDef.type) {
    case 'number': {
      // Convert mm to display units
      const displayValue = (value as number) / conversionFactor;
      const displayStep = (paramDef.step ?? 0.1) / conversionFactor;
      const displayMin = paramDef.min != null ? (paramDef.min as number) / conversionFactor : undefined;
      const displayMax = paramDef.max != null ? (paramDef.max as number) / conversionFactor : undefined;
      const displayUnit = paramDef.unit ? units : undefined;
      const isInvalid =
        (displayMin != null && displayValue < displayMin) || (displayMax != null && displayValue > displayMax);

      return (
        <div style={styles.paramRow}>
          <label style={styles.paramLabel}>
            {paramDef.label}
            {displayUnit && <span style={styles.paramUnit}> {displayUnit}</span>}
          </label>
          <input
            type="number"
            style={{
              ...styles.paramInput,
              ...(isInvalid ? styles.invalidInput : {}),
            }}
            value={parseFloat(displayValue.toFixed(4))}
            min={displayMin}
            max={displayMax}
            step={parseFloat(displayStep.toFixed(4))}
            onChange={(e) => onChange((parseFloat(e.target.value) || 0) * conversionFactor)}
            onBlur={(e) => {
              // Clamp value to valid range on blur
              let v = parseFloat(e.target.value) || 0;
              if (displayMin != null && v < displayMin) {
                v = displayMin;
                onChange(v * conversionFactor);
              } else if (displayMax != null && v > displayMax) {
                v = displayMax;
                onChange(v * conversionFactor);
              }
            }}
          />
          {isInvalid && (
            <span style={styles.validationHint}>
              {displayMin != null && displayValue < displayMin
                ? `min ${displayMin.toFixed(2)}`
                : `max ${displayMax?.toFixed(2)}`}
            </span>
          )}
        </div>
      );
    }

    case 'string':
      return (
        <div style={styles.paramRow}>
          <label style={styles.paramLabel}>{paramDef.label}</label>
          <input
            type="text"
            style={styles.paramInput}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            title={paramDef.description}
            placeholder={paramDef.description}
          />
        </div>
      );

    case 'boolean':
      return (
        <div style={styles.paramRow}>
          <label style={styles.paramLabel}>{paramDef.label}</label>
          <input type="checkbox" checked={value as boolean} onChange={(e) => onChange(e.target.checked)} />
        </div>
      );

    case 'enum':
      return (
        <div style={styles.paramRow}>
          <label style={styles.paramLabel}>{paramDef.label}</label>
          <select style={styles.paramSelect} value={value as string} onChange={(e) => onChange(e.target.value)}>
            {paramDef.enumValues?.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      );

    case 'reference': {
      const refId = value as string;
      const refFeature = refId ? features.find((f) => f.id === refId) : null;
      const refDef = refFeature ? getFeatureDefinition(refFeature.type) : null;
      const isValid = refId && refFeature && !refFeature.suppressed;

      return (
        <div style={{ ...styles.paramRow, flexDirection: 'column', alignItems: 'stretch' }}>
          <label style={styles.paramLabel}>{paramDef.label}</label>
          <div style={styles.refRow}>
            <select
              style={{
                ...styles.paramSelect,
                borderColor: refId && !isValid ? '#ef4444' : '#334155',
              }}
              value={refId}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">— none —</option>
              {features.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {refFeature && (
              <button
                style={styles.refSelectBtn}
                onClick={() => useCADStore.getState().select([refId])}
                title="Select this feature"
              >
                &#x2192;
              </button>
            )}
          </div>
          {refFeature && refDef && (
            <div style={styles.refInfo}>
              <span style={styles.refType}>
                {refDef.icon} {refDef.label}
              </span>
              {refFeature.suppressed && <span style={styles.refWarning}>suppressed</span>}
            </div>
          )}
          {refId && !refFeature && (
            <div style={styles.refInfo}>
              <span style={styles.refWarning}>missing reference</span>
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
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
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  nameInput: {
    flex: 1,
    padding: '4px 6px',
    fontSize: 12,
    fontWeight: 600,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 3,
    color: '#f1f5f9',
    outline: 'none',
  },
  suppressBtn: {
    padding: '2px 8px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
    color: '#f1f5f9',
    background: '#334155',
    border: '1px solid #475569',
    cursor: 'pointer',
  },
  suppressedBadge: {
    fontSize: 9,
    color: '#fbbf24',
    background: 'rgba(251, 191, 36, 0.15)',
    padding: '0 4px',
    borderRadius: 3,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  typeLabel: {
    fontSize: 12,
    color: '#e2e8f0',
    marginBottom: 8,
    fontWeight: 500,
  },
  assemblyInfo: {
    fontSize: 10,
    color: '#94a3b8',
    background: '#334155',
    padding: '3px 8px',
    borderRadius: 3,
    marginBottom: 8,
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
    flexShrink: 0,
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
    outline: 'none',
    minWidth: 0,
  },
  invalidInput: {
    borderColor: '#ef4444',
  },
  validationHint: {
    fontSize: 9,
    color: '#ef4444',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  paramSelect: {
    flex: 1,
    padding: '2px 4px',
    fontSize: 11,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 3,
    color: '#f1f5f9',
    outline: 'none',
    minWidth: 0,
  },
  refRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  refSelectBtn: {
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 12,
    color: '#3b82f6',
    background: 'transparent',
    border: '1px solid #334155',
    cursor: 'pointer',
    flexShrink: 0,
    lineHeight: 1,
  },
  refInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  refType: {
    fontSize: 10,
    color: '#64748b',
  },
  refWarning: {
    fontSize: 9,
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.12)',
    padding: '0 4px',
    borderRadius: 3,
  },
  emptyState: {
    padding: '16px 12px',
    textAlign: 'center' as const,
  },
  emptyText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic' as const,
  },
  massGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  massItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  massLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  massValue: {
    fontSize: 11,
    color: '#e2e8f0',
    fontFamily: 'monospace',
  },
};
